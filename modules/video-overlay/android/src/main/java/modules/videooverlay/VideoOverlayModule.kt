package modules.videooverlay

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VideoOverlayModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VideoOverlay")

    AsyncFunction("overlayImage") { videoUri: String, imageUri: String, outputUri: String ->
      // TODO: Implement video processing for Android
      // For now, return the input video as a placeholder
      videoUri
    }
  }
}
