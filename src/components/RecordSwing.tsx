import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Video, ResizeMode } from "expo-av";
import * as MediaLibrary from "expo-media-library";
import { HapticFeedback } from "../utils/haptics";

export interface RecordedSwing {
  uri: string;
  holeNumber: number;
  shotNumber: number;
  club: string;
  timestamp: number;
}

export interface RecordSwingProps {
  holeNumber: number;
  shotNumber: number;
  club: string;
  countdownSeconds?: number;
  durationSeconds?: number;
  onRecordingComplete?: (swing: RecordedSwing) => void;
  colors: {
    primary: string;
    surface: string;
    text: string;
    textSecondary: string;
    error: string;
  };
}

export const RecordSwing: React.FC<RecordSwingProps> = ({
  holeNumber,
  shotNumber,
  club,
  countdownSeconds = 5,
  durationSeconds = 30,
  onRecordingComplete,
  colors,
}) => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] =
    MediaLibrary.usePermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [recordedSwing, setRecordedSwing] = useState<RecordedSwing | null>(
    null
  );
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // Refs
  const cameraRef = useRef<any>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleRecordSwing = async () => {
    try {
      // Check camera permission
      if (!cameraPermission?.granted) {
        const { granted } = await requestCameraPermission();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Camera permission is required to record your swing."
          );
          return;
        }
      }

      // Check media library permission
      if (!mediaLibraryPermission?.granted) {
        const { granted } = await requestMediaLibraryPermission();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Media library permission is required to save your swing video."
          );
          return;
        }
      }

      // Reset state
      setRecordedSwing(null);

      // Show camera and start countdown
      setShowCamera(true);
      setCountdown(countdownSeconds);

      // Start countdown
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
    } catch (error) {
      console.error("Error starting record swing:", error);
      Alert.alert("Error", "Failed to start recording");
    }
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

      // Start duration timer BEFORE starting recording
      let duration = 0;
      recordingTimerRef.current = setInterval(() => {
        duration++;
        setRecordingDuration(duration);

        // Auto-stop at duration limit
        if (duration >= durationSeconds) {
          stopRecording();
        }
      }, 1000);

      // Start recording - this is async and returns when recording stops
      const video = await cameraRef.current.recordAsync({
        maxDuration: durationSeconds,
      });

      // Recording stopped (either manually or auto-stop)
      if (video && video.uri) {
        await saveVideoToGallery(video.uri);
      }
    } catch (error) {
      console.error("Error during recording:", error);
      // Clean up on error
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      setShowCamera(false);
      Alert.alert("Error", "Failed to record video");
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

  const saveVideoToGallery = async (uri: string) => {
    try {
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(uri);

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
        holeNumber,
        shotNumber,
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
            : "Record Swing"}
        </Text>
      </TouchableOpacity>

      {/* Video Thumbnail */}
      {recordedSwing && (
        <TouchableOpacity
          style={styles.videoThumbnailContainer}
          onPress={openVideoPlayer}
          activeOpacity={0.7}
          testID="video-thumbnail"
        >
          <Video
            source={{ uri: recordedSwing.uri }}
            style={styles.videoThumbnail}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            usePoster
          />
          <View style={styles.videoThumbnailTextContainer}>
            <Text style={styles.videoThumbnailTitle}>
              📹 Hole {recordedSwing.holeNumber} Shot {recordedSwing.shotNumber}{" "}
              - {recordedSwing.club}
            </Text>
            <Text style={styles.videoThumbnailSubtext}>
              Tap to view • All swings in Golf Swings folder
            </Text>
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
          {cameraPermission?.granted && (
            <CameraView
              ref={cameraRef}
              style={styles.cameraView}
              facing="front"
              mode="video"
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
              <Video
                source={{ uri: recordedSwing.uri }}
                style={styles.videoPlayer}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                useNativeControls
                isLooping
              />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowVideoPlayer(false)}
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
