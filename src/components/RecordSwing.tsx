import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Linking,
  AppState,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { VideoView, useVideoPlayer } from "expo-video";
import * as MediaLibrary from "expo-media-library";
import * as VideoThumbnails from 'expo-video-thumbnails';
import { HapticFeedback } from "../utils/haptics";
import PermissionService from "../services/PermissionService";

export interface RecordedSwing {
  uri: string;
  thumbnail?: string;
  holeNumber?: number;
  shotNumber?: number;
  type?: "shot" | "putt";
  club?: string;
  quality?: "good" | "bad";
  distance?: string;
  timestamp: number;
}

export interface RecordSwingProps {
  holeNumber?: number;
  shotNumber?: number;
  type?: "shot" | "putt";
  club?: string;
  triggerCount?: number;
  countdownSeconds?: number;
  durationSeconds?: number;
  onRecordingComplete?: (swing: RecordedSwing) => void;
  onCountdownStart?: () => void;
  isWaitingForVoice?: boolean;
  colors: {
    primary: string;
    surface: string;
    text: string;
    textSecondary: string;
    error: string;
  };
  muteVideo?: boolean;
}

export const RecordSwing: React.FC<RecordSwingProps> = ({
  holeNumber = 0,
  shotNumber = 0,
  type = "shot",
  club = "Standard",
  countdownSeconds = 5,
  durationSeconds = 30,
  onRecordingComplete,
  onCountdownStart,
  triggerCount = 0,
  isWaitingForVoice = false,
  colors,
  muteVideo = false,
}) => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] =
    MediaLibrary.usePermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [recordedSwing, setRecordedSwing] = useState<RecordedSwing | null>(
    null
  );
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Video Player - only load source if we are actually showing the player to prevent shadow audio
  const player = useVideoPlayer(showVideoPlayer ? (recordedSwing?.uri || "") : "", (player) => {
    player.loop = false;
  });

  useEffect(() => {
    player.playbackRate = playbackRate;
  }, [player, playbackRate]);

  useEffect(() => {
    const subscription = player.addListener("playingChange", (event) => {
      setIsPlaying(event.isPlaying);
    });
    return () => subscription.remove();
  }, [player]);

  // Ensure player pauses when modal closes to prevent shadow audio
  useEffect(() => {
    if (!showVideoPlayer) {
      player.pause();
    }
  }, [showVideoPlayer, player]);

  const handleRecordSwing = async () => {
    console.log("⛳️ handleRecordSwing: triggered");
    try {
      console.log("⛳️ handleRecordSwing: checking status from hooks...", {
        camera: cameraPermission?.status,
        mic: micPermission?.status,
        media: mediaLibraryPermission?.status
      });

      let allGranted = true;
      if (cameraPermission?.status !== 'granted') {
        const res = await requestCameraPermission();
        if (res.status !== 'granted') allGranted = false;
      }
      if (allGranted && micPermission?.status !== 'granted') {
        const res = await requestMicPermission();
        if (res.status !== 'granted') allGranted = false;
      }
      if (allGranted && mediaLibraryPermission?.status !== 'granted') {
        const res = await requestMediaLibraryPermission();
        if (res.status !== 'granted') allGranted = false;
      }

      console.log("⛳️ handleRecordSwing: allGranted =", allGranted);
      if (!allGranted) return;

      setRecordedSwing(null);
      setIsCameraReady(false);
      setShowCamera(true);
      console.log("⛳️ handleRecordSwing: showCamera -> true");
    } catch (error) {
      console.error("⛳️ handleRecordSwing ERROR:", error);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  // Refs
  const cameraRef = useRef<any>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle external trigger
  useEffect(() => {
    if (triggerCount === 0) return;

    if (triggerCount > 0) {
      console.log("⛳️ RecordSwing: Start trigger detected, triggerCount =", triggerCount);
      handleRecordSwing();
    } else if (triggerCount < 0 && isRecording) {
      console.log("⛳️ RecordSwing: Stop trigger detected, triggerCount =", triggerCount);
      stopRecording();
    }
  }, [triggerCount]);

  // Cleanup on unmount
  useEffect(() => {
    // Refresh permissions when coming back to foreground
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log("⛳️ RecordSwing: App back to foreground, refreshing permissions...");
        requestCameraPermission();
        requestMicPermission();
        requestMediaLibraryPermission();
      }
    });

    return () => {
      subscription.remove();
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);


  const startCountdown = () => {
    if (countdownTimerRef.current) return;

    if (onCountdownStart) {
      onCountdownStart();
    }

    setCountdown(countdownSeconds);
    let count = countdownSeconds;
    countdownTimerRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        HapticFeedback.light();
      } else {
        setCountdown(null);
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        startRecording();
      }
    }, 1000);
  };

  const startRecording = async () => {
    try {
      if (!cameraRef.current) {
        Alert.alert("Error", "Camera not ready");
        return;
      }

      setIsRecording(true);
      setRecordingDuration(0);
      HapticFeedback.success();

      // Start duration timer
      let duration = 0;
      recordingTimerRef.current = setInterval(() => {
        duration++;
        setRecordingDuration(duration);

        // Auto-stop at duration limit
        if (duration >= durationSeconds) {
          stopRecording();
        }
      }, 1000);

      // Start recording
      const video = await cameraRef.current.recordAsync({
        maxDuration: durationSeconds,
        mute: muteVideo,
      });

      // Recording stopped (either manually or auto-stop)
      if (video && video.uri) {
        // Capture the duration safely before it's reset
        await saveVideoToGallery(video.uri, duration);
      }
    } catch (error: any) {
      console.error("Error during recording:", error);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      // Clean up on error
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      setShowCamera(false);
      Alert.alert("Error", `Failed to record video: ${error?.message || "Unknown error"}`);
    }
  };

  const stopRecording = async () => {
    try {
      // Clear timer first
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Stop the camera recording
      if (cameraRef.current && isRecording) {
        cameraRef.current.stopRecording();
      }

      setIsRecording(false);
      setRecordingDuration(0);
      HapticFeedback.success();
    } catch (error) {
      console.error("Error stopping recording:", error);
      setIsRecording(false);
      setRecordingDuration(0);
      setShowCamera(false);
    }
  };

  const saveVideoToGallery = async (uri: string, duration: number) => {
    try {
      // 1. Generate middle-frame thumbnail
      let thumbnailUri = undefined;
      try {
        // Safe check for the native module
        if (VideoThumbnails && typeof VideoThumbnails.getThumbnailAsync === 'function') {
          // Use duration to find the middle.
          // duration is in seconds, getThumbnailAsync expects milliseconds.
          const midTime = Math.floor((duration / 2) * 1000);
          console.log(`⛳️ Generating thumbnail for ${uri} at ${midTime}ms (duration: ${duration}s)`);

          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
            time: midTime,
            quality: 0.7,
          });
          thumbnailUri = thumbUri;
        } else {
          console.warn("⛳️ VideoThumbnails native module not available. Thumbnail will be missing.");
        }
      } catch (e) {
        console.warn("Failed to generate middle-frame thumbnail:", e);
      }

      // 2. Save to media library
      const asset = await MediaLibrary.createAssetAsync(uri);

      // Also save thumbnail if it exists
      if (thumbnailUri) {
        try {
          await MediaLibrary.createAssetAsync(thumbnailUri);
        } catch (e) {
          console.warn("Failed to save thumbnail to media library:", e);
        }
      }

      // Get album or create it
      const album = await MediaLibrary.getAlbumAsync("Golf Swings");
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync("Golf Swings", asset, false);
      }

      // Create RecordedSwing object with metadata
      const swing: RecordedSwing = {
        uri,
        thumbnail: thumbnailUri,
        holeNumber,
        shotNumber,
        type,
        club,
        timestamp: Date.now(),
      };

      // Store and notify
      setRecordedSwing(swing);
      setShowCamera(false);

      if (onRecordingComplete) {
        onRecordingComplete(swing);
      }
    } catch (error) {
      console.error("Error saving video:", error);
      setShowCamera(false);
      Alert.alert(
        "Error",
        "Video recorded but failed to save to gallery. Check app permissions."
      );
    }
  };

  const cancelRecording = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // Stop camera if recording
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }

    setCountdown(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setShowCamera(false);
  };

  const openVideoPlayer = () => {
    setShowVideoPlayer(true);
  };

  const styles = StyleSheet.create({
    recordSwingButton: {
      height: 40,
      paddingHorizontal: 10,
      borderRadius: 20,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    recordingButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    recordSwingButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    videoThumbnailContainer: {
      marginTop: 8,
      marginBottom: 8,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    videoThumbnail: {
      width: "100%",
      height: 120,
    },
    videoThumbnailTextContainer: {
      padding: 12,
      backgroundColor: colors.surface,
    },
    videoThumbnailTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    videoThumbnailSubtext: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    cameraModal: {
      flex: 1,
      backgroundColor: "#000000",
    },
    cameraView: {
      flex: 1,
    },
    cameraOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    countdownText: {
      fontSize: 48,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    recordingInfo: {
      position: "absolute",
      top: 60,
      alignSelf: "center",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    recordingDurationText: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    cameraControls: {
      position: "absolute",
      bottom: 40,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 20,
    },
    button: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      minWidth: 120,
      alignItems: "center",
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    videoPlayerModal: {
      flex: 1,
      backgroundColor: "#000000",
    },
    videoPlayer: {
      flex: 1,
    },
    closeButton: {
      position: "absolute",
      top: 50,
      right: 20,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    closeButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    speedControls: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
      backgroundColor: "#000000",
      paddingVertical: 20,
      paddingBottom: 40,
    },
    speedButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
      minWidth: 80,
    },
    speedButtonActive: {
      backgroundColor: colors.primary,
      borderColor: "#FFFFFF",
    },
    speedButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },
  });

  return (
    <>
      {/* Record Swing Button */}
      <TouchableOpacity
        style={[
          styles.recordSwingButton,
          (isRecording || countdown !== null) && styles.recordingButton,
        ]}
        onPress={isRecording ? stopRecording : handleRecordSwing}
        disabled={countdown !== null && !isRecording}
      >
        <Text style={styles.recordSwingButtonText}>
          {countdown !== null
            ? `${countdown}`
            : isRecording
              ? `Stop Recording (${recordingDuration}s)`
              : isWaitingForVoice
                ? "🎙️ Listening..."
                : "Record Swing"}
        </Text>
      </TouchableOpacity >

      {/* Permission Fallback UI */}
      {
        (!cameraPermission?.granted || !micPermission?.granted || !mediaLibraryPermission?.granted) && (
          <TouchableOpacity
            style={{
              marginTop: 4,
              padding: 8,
              backgroundColor: `${colors.error}15`,
              borderRadius: 8,
              borderStyle: 'dashed',
              borderWidth: 1,
              borderColor: colors.error,
              marginBottom: 8
            }}
          >
            <Text style={{ color: colors.error, fontSize: 11, textAlign: 'center', fontWeight: '600' }}>
              ⚠️ Permissions Required: {[
                !cameraPermission?.granted && 'Camera',
                !micPermission?.granted && 'Microphone',
                !mediaLibraryPermission?.granted && (Platform.OS === 'android' ? 'Photos/Videos' : 'Photo Library')
              ].filter(Boolean).join(', ')}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => {
                  console.log("⛳️ RecordSwing: Opening app settings for permissions...");
                  Linking.openSettings();
                }}
                style={{ padding: 4 }}
              >
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>Open Settings</Text>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: colors.textSecondary, height: 10, alignSelf: 'center', opacity: 0.3 }} />
              <TouchableOpacity
                onPress={() => {
                  console.log("⛳️ RecordSwing: Manual permission refresh...");
                  requestCameraPermission();
                  requestMicPermission();
                  requestMediaLibraryPermission();
                }}
                style={{ padding: 4 }}
              >
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}



      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        transparent={false}
        animationType="slide"
        onRequestClose={cancelRecording}
      >
        <View style={styles.cameraModal}>
          {cameraPermission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={styles.cameraView}
              facing="front" // Back to front camera per user request
              mode="video"
              onCameraReady={() => {
                console.log("⛳️ CameraView: onCameraReady fired");
                setIsCameraReady(true);
                startCountdown();
              }}
              onMountError={(error) => {
                console.error("⛳️ CameraView: mount error:", error);
                Alert.alert("Camera Error", `Failed to start camera: ${error.message}`);
                setShowCamera(false);
              }}
              mute={muteVideo}
            >
              <View style={styles.cameraOverlay}>
                {countdown !== null && (
                  <Text style={styles.countdownText} testID="countdown-text">
                    {countdown}
                  </Text>
                )}
              </View>

              {isRecording && (
                <View style={styles.recordingInfo}>
                  <Text style={styles.recordingDurationText}>
                    🔴 Recording: {recordingDuration}s / {durationSeconds}s
                  </Text>
                </View>
              )}

              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.error }]}
                  onPress={cancelRecording}
                >
                  <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                {isRecording && (
                  <TouchableOpacity
                    testID="stop-recording-button"
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={stopRecording}
                  >
                    <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
                      Stop Recording
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </CameraView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#1a1a1a' }}>
              <Text style={{ color: '#fff', fontSize: 24, marginBottom: 10 }}>⚠️</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 }}>
                Permissions Required
              </Text>
              <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 30 }}>
                Camera and microphone access are needed to record your swing.
                Please enable them in your device settings.
              </Text>

              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderRadius: 12,
                  width: '100%',
                  alignItems: 'center'
                }}
                onPress={() => Linking.openSettings()}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Open Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 25 }}
                onPress={cancelRecording}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Video Player Modal */}
      <Modal
        visible={showVideoPlayer}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowVideoPlayer(false)}
      >
        <View style={styles.videoPlayerModal}>
          {recordedSwing && (
            <>
              <VideoView
                player={player}
                style={styles.videoPlayer}
                contentFit="contain"
                allowsFullscreen
                allowsPictureInPicture
              />
              <View style={styles.speedControls}>
                {[1.0, 0.5, 0.25].map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    style={styles.speedButton}
                    onPress={() => {
                      setPlaybackRate(rate);
                      player.play();
                      HapticFeedback.light();
                    }}
                  >
                    <Text style={styles.speedButtonText}>
                      {rate === 1.0 ? "1x" : `${rate}x`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowVideoPlayer(false);
                  setPlaybackRate(1.0); // Reset on close
                }}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </>
  );
};
