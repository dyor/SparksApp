import ExpoModulesCore
import AVFoundation
import UIKit

public class VideoOverlayModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VideoOverlay")

    AsyncFunction("overlayImage") { (videoUri: String, imageUri: String, outputUri: String, promise: Promise) in
      guard let videoURL = URL(string: videoUri),
            let imageURL = URL(string: imageUri) else {
        promise.reject("INVALID_URL", "Invalid video or image URL")
        return
      }

      let fileManager = FileManager.default
      
      // Load video asset
      let asset = AVURLAsset(url: videoURL)
      let composition = AVMutableComposition()
      
      guard let compositionTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid),
            let assetTrack = asset.tracks(withMediaType: .video).first else {
        promise.reject("ASSET_ERROR", "Could not load video track")
        return
      }
      
      do {
        try compositionTrack.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: assetTrack, at: .zero)
        compositionTrack.preferredTransform = assetTrack.preferredTransform
      } catch {
        promise.reject("COMPOSITION_ERROR", "Failed to insert track")
        return
      }
      
      let videoSize = compositionTrack.naturalSize
      
      // Load and resize image
      guard let imageData = try? Data(contentsOf: imageURL),
            let image = UIImage(data: imageData) else {
        promise.reject("IMAGE_ERROR", "Could not load overlay image")
        return
      }
      
      let layer = CALayer()
      layer.contents = image.cgImage
      layer.frame = CGRect(origin: .zero, size: videoSize)
      layer.opacity = 1.0
      
      let videoLayer = CALayer()
      videoLayer.frame = CGRect(origin: .zero, size: videoSize)
      
      let parentLayer = CALayer()
      parentLayer.frame = CGRect(origin: .zero, size: videoSize)
      parentLayer.addSublayer(videoLayer)
      parentLayer.addSublayer(layer)
      
      let videoComposition = AVMutableVideoComposition()
      videoComposition.renderSize = videoSize
      videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
      videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)
      
      let instruction = AVMutableVideoCompositionInstruction()
      instruction.timeRange = CMTimeRange(start: .zero, duration: asset.duration)
      let transformer = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionTrack)
      instruction.layerInstructions = [transformer]
      videoComposition.instructions = [instruction]
      
      // Export
      let outputURL = URL(fileURLWithPath: outputUri.replacingOccurrences(of: "file://", with: ""))
      
      // Remove existing file
      try? fileManager.removeItem(at: outputURL)
      
      guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
        promise.reject("EXPORT_ERROR", "Could not create export session")
        return
      }
      
      exporter.outputURL = outputURL
      exporter.outputFileType = .mp4
      exporter.videoComposition = videoComposition
      exporter.shouldOptimizeForNetworkUse = true
      
      exporter.exportAsynchronously {
        switch exporter.status {
        case .completed:
          promise.resolve(outputUri)
        case .failed:
          promise.reject("EXPORT_FAILED", exporter.error?.localizedDescription ?? "Unknown error")
        case .cancelled:
          promise.reject("EXPORT_CANCELLED", "Export cancelled")
        default:
          break
        }
      }
    }
  }
}
