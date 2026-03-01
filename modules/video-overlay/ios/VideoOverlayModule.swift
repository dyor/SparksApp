import ExpoModulesCore
import AVFoundation
import UIKit

public class VideoOverlayModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VideoOverlay")

    AsyncFunction("overlayImage") { (videoUri: String, imageUri: String, outputUri: String, promise: Promise) in
      // Existing implementation preserved...
      processVideo(videoUri: videoUri, imageUri: imageUri, captions: nil, outputUri: outputUri, promise: promise)
    }

    AsyncFunction("burnScript") { (videoUri: String, scriptItems: [[String: Any]], outputUri: String, promise: Promise) in
      processVideo(videoUri: videoUri, imageUri: nil, captions: scriptItems, outputUri: outputUri, promise: promise)
    }
  }

  private func processVideo(videoUri: String, imageUri: String?, captions: [[String: Any]]?, outputUri: String, promise: Promise) {
    guard let videoURL = URL(string: videoUri) else {
      promise.reject("INVALID_URL", "Invalid video URL")
      return
    }

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
      
      // Audio Support
      if let audioTrack = asset.tracks(withMediaType: .audio).first {
        let compositionAudioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
        try compositionAudioTrack?.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: audioTrack, at: .zero)
      }
    } catch {
      promise.reject("COMPOSITION_ERROR", "Failed to insert tracks: \(error.localizedDescription)")
      return
    }
    
    // Normalize Size (considering transform)
    let naturalSize = assetTrack.naturalSize
    let t = assetTrack.preferredTransform
    var videoSize = naturalSize
    if abs(t.b) == 1 && abs(t.c) == 1 {
        videoSize = CGSize(width: naturalSize.height, height: naturalSize.width)
    }

    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: videoSize)
    
    let videoLayer = CALayer()
    videoLayer.frame = CGRect(origin: .zero, size: videoSize)
    parentLayer.addSublayer(videoLayer)

    // Handle Image Overlay
    if let imageUri = imageUri, let imageURL = URL(string: imageUri) {
        if let imageData = try? Data(contentsOf: imageURL), let image = UIImage(data: imageData) {
            let imgLayer = CALayer()
            imgLayer.contents = image.cgImage
            imgLayer.frame = CGRect(origin: .zero, size: videoSize)
            imgLayer.opacity = 1.0
            parentLayer.addSublayer(imgLayer)
        }
    }

    // Handle Script Burn-in
    if let captions = captions {
        for item in captions {
            guard let text = item["text"] as? String,
                  let start = item["start"] as? Double,
                  let end = item["end"] as? Double else { continue }
            
            let textLayer = CATextLayer()
            textLayer.string = text
            textLayer.font = UIFont.systemFont(ofSize: 48, weight: .black)
            textLayer.fontSize = 48
            textLayer.foregroundColor = UIColor.white.cgColor
            textLayer.alignmentMode = .center
            textLayer.isWrapped = true
            textLayer.truncationMode = .end
            textLayer.contentsScale = UIScreen.main.scale
            
            // Background Bubble Effect
            textLayer.backgroundColor = UIColor(white: 0, alpha: 0.7).cgColor
            textLayer.cornerRadius = 12
            
            // Positioning
            let margin: CGFloat = 40
            let height: CGFloat = 120
            textLayer.frame = CGRect(x: margin, y: 80, width: videoSize.width - (margin * 2), height: height)
            
            // Visibility Animation
            textLayer.opacity = 0
            let startAction = CABasicAnimation(keyPath: "opacity")
            startAction.fromValue = 0
            startAction.toValue = 1
            startAction.duration = 0.1
            startAction.beginTime = AVCoreAnimationBeginTimeAtZero + start
            startAction.fillMode = .forwards
            startAction.isRemovedOnCompletion = false
            textLayer.add(startAction, forKey: "show")
            
            let endAction = CABasicAnimation(keyPath: "opacity")
            endAction.fromValue = 1
            endAction.toValue = 0
            endAction.duration = 0.1
            endAction.beginTime = AVCoreAnimationBeginTimeAtZero + end
            endAction.fillMode = .forwards
            endAction.isRemovedOnCompletion = false
            textLayer.add(endAction, forKey: "hide")
            
            parentLayer.addSublayer(textLayer)
        }
    }

    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = videoSize
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parentLayer)
    
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(start: .zero, duration: asset.duration)
    let transformer = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionTrack)
    
    // Correctly apply transform to center the video if it's vertical
    transformer.setTransform(assetTrack.preferredTransform, at: .zero)
    
    instruction.layerInstructions = [transformer]
    videoComposition.instructions = [instruction]
    
    let outputURL = URL(fileURLWithPath: outputUri.replacingOccurrences(of: "file://", with: ""))
    try? FileManager.default.removeItem(at: outputURL)
    
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
      case .completed: promise.resolve(outputUri)
      case .failed: promise.reject("EXPORT_FAILED", exporter.error?.localizedDescription ?? "Unknown error")
      case .cancelled: promise.reject("EXPORT_CANCELLED", "Export cancelled")
      default: break
      }
    }
  }
}
