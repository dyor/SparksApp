import AVFoundation
import ReplayKit
import UserNotifications
import Darwin

@_silgen_name("finishBroadcastGracefully")
func finishBroadcastGracefully(_ handler: RPBroadcastSampleHandler)

/*
 Handles the main processing of the global broadcast.
 The app-group identifier is fetched from the extension's Info.plist
 ("BroadcastExtensionAppGroupIdentifier" key) so you don't have to hard-code it here.
 */
final class SampleHandler: RPBroadcastSampleHandler {

  // MARK: – Properties

  private func appGroupIDFromPlist() -> String? {
    guard let value = Bundle.main.object(forInfoDictionaryKey: "BroadcastExtensionAppGroupIdentifier") as? String,
      !value.isEmpty
    else {
      return nil
    }
    return value
  }
  
  // Store both the CFString and CFNotificationName versions
  private static let stopNotificationString = "com.nitroscreenrecorder.stopBroadcast" as CFString
  private static let stopNotificationName = CFNotificationName(stopNotificationString)

  private lazy var hostAppGroupIdentifier: String? = {
    return appGroupIDFromPlist()
  }()

  private var writer: BroadcastWriter?
  private let fileManager: FileManager = .default
  private let nodeURL: URL
  private var sawMicBuffers = false

  // MARK: – Init
  override init() {
    nodeURL = fileManager.temporaryDirectory
      .appendingPathComponent(UUID().uuidString)
      .appendingPathExtension(for: .mpeg4Movie)

    fileManager.removeFileIfExists(url: nodeURL)
    super.init()
  }
  
  deinit {
    CFNotificationCenterRemoveObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()),
      SampleHandler.stopNotificationName,
      nil
    )
  }
  
  private func startListeningForStopSignal() {
    let center = CFNotificationCenterGetDarwinNotifyCenter()

    CFNotificationCenterAddObserver(
      center,
      UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()),
      { _, observer, name, _, _ in
        guard
          let observer,
          let name,
          name == SampleHandler.stopNotificationName
        else { return }

        let me = Unmanaged<SampleHandler>
          .fromOpaque(observer)
          .takeUnretainedValue()
        me.stopBroadcastGracefully()
      },
      SampleHandler.stopNotificationString,
      nil,
      .deliverImmediately
    )
  }

  // MARK: – Broadcast lifecycle
  override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
    startListeningForStopSignal()

    guard let groupID = hostAppGroupIdentifier else {
      finishBroadcastWithError(
        NSError(
          domain: "SampleHandler", 
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Missing app group identifier"]
        )
      )
      return
    }

    // Clean up old recordings
    cleanupOldRecordings(in: groupID)

    // Start recording
    let screen: UIScreen = .main
    do {
      writer = try .init(
        outputURL: nodeURL,
        screenSize: screen.bounds.size,
        screenScale: screen.scale
      )
      try writer?.start()
    } catch {
      finishBroadcastWithError(error)
    }
  }

  private func cleanupOldRecordings(in groupID: String) {
    guard let docs = fileManager.containerURL(
      forSecurityApplicationGroupIdentifier: groupID)?
      .appendingPathComponent("Library/Documents/", isDirectory: true)
    else { return }

    do {
      let items = try fileManager.contentsOfDirectory(at: docs, includingPropertiesForKeys: nil)
      for url in items where url.pathExtension.lowercased() == "mp4" {
        try? fileManager.removeItem(at: url)
      }
    } catch {
      // Non-critical error, continue with broadcast
    }
  }

  override func processSampleBuffer(
    _ sampleBuffer: CMSampleBuffer,
    with sampleBufferType: RPSampleBufferType
  ) {
    guard let writer else { return }

    if sampleBufferType == .audioMic { 
      sawMicBuffers = true 
    }

    do {
      _ = try writer.processSampleBuffer(sampleBuffer, with: sampleBufferType)
    } catch {
      finishBroadcastWithError(error)
    }
  }

  override func broadcastPaused() { 
    writer?.pause() 
  }
  
  override func broadcastResumed() { 
    writer?.resume() 
  }

  private func stopBroadcastGracefully() {
    finishBroadcastGracefully(self)
  }
  
  override func broadcastFinished() {
    guard let writer else { return }

    // Finish writing
    let outputURL: URL
    do {
      outputURL = try writer.finish()
    } catch {
      // Writer failed, but we can't call finishBroadcastWithError here
      // as we're already in the finish process
      return
    }

    guard let groupID = hostAppGroupIdentifier else { return }

    // Get container directory
    guard let containerURL = fileManager
      .containerURL(forSecurityApplicationGroupIdentifier: groupID)?
      .appendingPathComponent("Library/Documents/", isDirectory: true)
    else { return }

    // Create directory if needed
    do {
      try fileManager.createDirectory(at: containerURL, withIntermediateDirectories: true)
    } catch {
      return
    }

    // Move file to shared container
    let destination = containerURL.appendingPathComponent(outputURL.lastPathComponent)
    do {
      try fileManager.moveItem(at: outputURL, to: destination)
    } catch {
      // File move failed, but we can't error out at this point
      return
    }

    // Persist microphone state
    UserDefaults(suiteName: groupID)?
      .set(sawMicBuffers, forKey: "LastBroadcastMicrophoneWasEnabled")
  }
}

// MARK: – Helpers
extension FileManager {
  fileprivate func removeFileIfExists(url: URL) {
    guard fileExists(atPath: url.path) else { return }
    try? removeItem(at: url)
  }
}