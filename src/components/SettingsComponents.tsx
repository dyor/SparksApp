import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Modal,
  RefreshControl,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { HapticFeedback } from "../utils/haptics";
import { StarRating } from "./StarRating";
import { FeedbackService } from "../services/FeedbackService";
import { FeedbackNotificationService } from "../services/FeedbackNotificationService";
import { NotificationBadge } from "./NotificationBadge";
import { ServiceFactory } from "../services/ServiceFactory";
import { CommonModal } from "./CommonModal";

interface SettingsContainerProps {
  children: React.ReactNode;
}

export const SettingsContainer: React.FC<SettingsContainerProps> = ({
  children,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  return <View style={styles.container}>{children}</View>;
};

interface SettingsScrollViewProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

export const SettingsScrollView = React.forwardRef<
  ScrollView,
  SettingsScrollViewProps
>(({ children, onRefresh, refreshing = false }, ref) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    scrollContainer: {
      padding: 20,
    },
  });

  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
      title={refreshing ? "Refreshing..." : "Pull to refresh"}
      titleColor={colors.textSecondary}
    />
  ) : undefined;

  return (
    <ScrollView
      ref={ref as any}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
});

// For proper display in DevTools
SettingsScrollView.displayName = "SettingsScrollView";

interface SettingsHeaderProps {
  title: string;
  subtitle: string;
  icon?: string;
  sparkId?: string; // For showing Spark Message Count badge
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  title,
  subtitle,
  icon,
  sparkId,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    header: {
      alignItems: "center",
      marginBottom: 30,
    },
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });

  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <View style={{ position: "relative" }}>
          <Text style={styles.title}>
            {icon && `${icon} `}
            {title}
          </Text>
          {sparkId && <NotificationBadge sparkId={sparkId} size="small" />}
        </View>
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    section: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 15,
    },
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
};

interface SettingsInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?:
    | "default"
    | "number-pad"
    | "decimal-pad"
    | "numeric"
    | "email-address"
    | "phone-pad";
}

export const SettingsInput: React.FC<SettingsInputProps> = ({
  placeholder,
  value,
  onChangeText,
  multiline = false,
  numberOfLines = 1,
  keyboardType = "default",
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
      minHeight: multiline ? numberOfLines * 24 + 24 : 44,
      minWidth: 150,
    },
  });

  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      textAlignVertical={multiline ? "top" : "center"}
    />
  );
};

interface SettingsButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline";
  disabled?: boolean;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}) => {
  const { colors } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = {
      opacity: disabled ? 0.6 : 1,
    };

    switch (variant) {
      case "primary":
        return {
          backgroundColor: colors.primary,
          borderWidth: 0,
          ...baseStyle,
        };
      case "secondary":
        return {
          backgroundColor: colors.border,
          borderWidth: 0,
          ...baseStyle,
        };
      case "danger":
        return {
          backgroundColor: colors.error,
          borderWidth: 0,
          ...baseStyle,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: colors.border,
          ...baseStyle,
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderWidth: 0,
          ...baseStyle,
        };
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "primary":
        return { color: "#fff" };
      case "secondary":
        return { color: colors.text };
      case "danger":
        return { color: "#fff" };
      case "outline":
        return { color: colors.text };
      default:
        return { color: "#fff" };
    }
  };

  const styles = StyleSheet.create({
    button: {
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 12,
      ...getButtonStyle(),
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      ...getTextStyle(),
    },
  });

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

interface SettingsButtonRowProps {
  children: React.ReactNode;
}

export const SettingsButtonRow: React.FC<SettingsButtonRowProps> = ({
  children,
}) => {
  const styles = StyleSheet.create({
    buttonContainer: {
      flexDirection: "row",
      gap: 12,
    },
  });

  return <View style={styles.buttonContainer}>{children}</View>;
};

interface SaveCancelButtonsProps {
  onSave: () => void;
  onCancel: () => void;
  saveText?: string;
  cancelText?: string;
  saveDisabled?: boolean;
}

export const SaveCancelButtons: React.FC<SaveCancelButtonsProps> = ({
  onSave,
  onCancel,
  saveText = "Save Changes",
  cancelText = "Cancel",
  saveDisabled = false,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    buttonContainer: {
      flexDirection: "row",
      gap: 12,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 8,
      alignItems: "center",
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    saveButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[styles.button, styles.cancelButton]}
        onPress={onCancel}
      >
        <Text style={styles.cancelButtonText}>{cancelText}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          styles.saveButton,
          saveDisabled && { opacity: 0.6 },
        ]}
        onPress={onSave}
        disabled={saveDisabled}
      >
        <Text style={styles.saveButtonText}>{saveText}</Text>
      </TouchableOpacity>
    </View>
  );
};

interface SettingsItemProps {
  children: React.ReactNode;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({ children }) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    item: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
  });

  return <View style={styles.item}>{children}</View>;
};

interface SettingsTextProps {
  children: React.ReactNode;
  variant?: "body" | "caption";
}

export const SettingsText: React.FC<SettingsTextProps> = ({
  children,
  variant = "body",
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    bodyText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    captionText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

  const textStyle = variant === "body" ? styles.bodyText : styles.captionText;

  return <Text style={textStyle}>{children}</Text>;
};

interface SettingsRemoveButtonProps {
  onPress: () => void;
  text?: string;
}

export const SettingsRemoveButton: React.FC<SettingsRemoveButtonProps> = ({
  onPress,
  text = "Remove",
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    removeButton: {
      backgroundColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginLeft: 10,
    },
    removeButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
  });

  return (
    <TouchableOpacity style={styles.removeButton} onPress={onPress}>
      <Text style={styles.removeButtonText}>{text}</Text>
    </TouchableOpacity>
  );
};

interface SettingsToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  value,
  onValueChange,
  label,
}) => {
  const { colors } = useTheme();
  const { Switch } = require("react-native"); // Dynamic import to avoid issues if not used elsewhere

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
      }}
    >
      {label && (
        <Text style={{ fontSize: 16, color: colors.text }}>{label}</Text>
      )}
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={
          Platform.OS === "ios" ? "#fff" : value ? colors.primary : "#f4f3f4"
        }
      />
    </View>
  );
};

// Enhanced Feedback Modal Component
interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  sparkName: string;
  sparkId: string;
  onSubmit: (rating: number, feedback: string) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  sparkName,
  sparkId,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(0, feedback); // Rating is handled separately now
      HapticFeedback.success();
      onClose();
      // Reset form
      setFeedback("");
    } catch (error) {
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <TouchableOpacity
        style={{
          flex: 1,
          padding: 12,
          borderRadius: 8,
          alignItems: "center",
          backgroundColor: colors.border,
        }}
        onPress={onClose}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>
          Cancel
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{
          flex: 1,
          padding: 12,
          borderRadius: 8,
          alignItems: "center",
          backgroundColor: colors.primary,
          opacity: isSubmitting ? 0.6 : 1,
        }}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <CommonModal
      visible={visible}
      title="Share Feedback"
      onClose={onClose}
      footer={footer}
    >
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        Your feedback helps us improve {sparkName}
      </Text>

      <TextInput
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          color: colors.text,
          minHeight: 120,
          textAlignVertical: "top",
          marginBottom: 20,
        }}
        placeholder="Share your thoughts, suggestions, or issues..."
        placeholderTextColor={colors.textSecondary}
        value={feedback}
        onChangeText={setFeedback}
        multiline
        numberOfLines={5}
        autoFocus
      />
    </CommonModal>
  );
};

// Feedback Item Component
interface FeedbackItemProps {
  rating: number;
  comment?: string;
  response?: string;
  createdAt: string;
}

interface FeedbackItemProps {
  rating: number;
  comment?: string;
  response?: string;
  createdAt: string;
  feedbackId?: string; // Add feedbackId for debugging
  readByUser?: boolean; // Whether user has read the response
  onMarkAsRead?: (feedbackId: string) => Promise<void>; // Callback to mark as read
}

const FeedbackItem: React.FC<FeedbackItemProps> = ({
  rating,
  comment,
  response,
  createdAt,
  feedbackId,
  readByUser,
  onMarkAsRead,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    item: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    rating: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    ratingText: {
      fontSize: 14,
      color: colors.text,
      marginLeft: 8,
    },
    date: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    feedback: {
      fontSize: 14,
      color: colors.text,
      marginBottom: response ? 12 : 0,
    },
    response: {
      backgroundColor: colors.primary + "20",
      borderRadius: 6,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    responseLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
      marginBottom: 4,
    },
    responseText: {
      fontSize: 14,
      color: colors.text,
    },
    markAsReadButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    markAsReadButtonText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.item}>
      <View style={styles.header}>
        {rating > 0 ? (
          <View style={styles.rating}>
            <StarRating
              key={rating}
              rating={rating}
              onRatingChange={() => {}}
              disabled
              size={16}
            />
            <Text style={styles.ratingText}>{rating}/5</Text>
          </View>
        ) : (
          <Text style={styles.ratingText}>💬 Feedback</Text>
        )}
        <Text style={styles.date}>
          {new Date(createdAt).toLocaleDateString()}
        </Text>
      </View>

      {comment && comment.trim() ? (
        <Text style={styles.feedback}>{comment}</Text>
      ) : (
        <></>
      )}

      {response && (
        <View style={styles.response}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 8,
            }}
          >
            <Text style={styles.responseLabel}>Response:</Text>
            {!readByUser && feedbackId && onMarkAsRead && (
              <TouchableOpacity
                style={styles.markAsReadButton}
                onPress={() => onMarkAsRead(feedbackId)}
              >
                <Text style={styles.markAsReadButtonText}>Mark as Read</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.responseText}>{response}</Text>
        </View>
      )}
    </View>
  );
};

interface SettingsFeedbackSectionProps {
  sparkName: string;
  sparkId?: string;
}

export interface SettingsFeedbackSectionRef {
  refresh: () => Promise<void>;
}

export const SettingsFeedbackSection = forwardRef<
  SettingsFeedbackSectionRef,
  SettingsFeedbackSectionProps
>(function SettingsFeedbackSection({ sparkName, sparkId = "app" }, ref) {
  const { colors } = useTheme();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [userFeedbacks, setUserFeedbacks] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFeedback = async () => {
    try {
      setIsLoading(true);
      // Use persistent device ID to ensure consistency
      const deviceId =
        await FeedbackNotificationService.getPersistentDeviceId();

      // Ensure Firebase is initialized before trying to get feedback
      await ServiceFactory.ensureFirebaseInitialized();

      const feedbacks = await FeedbackService.getUserFeedback(
        deviceId,
        sparkId
      );
      setUserFeedbacks(feedbacks || []);
    } catch (error) {
      console.error("Error loading feedback:", error);
      setUserFeedbacks([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Load user feedback on mount
  useEffect(() => {
    loadUserFeedback();
  }, []);

  // Expose refresh function to parent
  useImperativeHandle(
    ref,
    () => ({
      refresh: loadUserFeedback,
    }),
    [sparkId]
  );

  // NOTE: Auto-clear on focus was removed. Users now manually mark as read with button.
  const handleSubmitFeedback = async (rating: number, feedback: string) => {
    try {
      console.log(
        "🚀 SettingsFeedbackSection: Starting feedback submission..."
      );

      // Ensure services are initialized
      await ServiceFactory.ensureAnalyticsInitialized();
      await ServiceFactory.ensureFirebaseInitialized();

      const AnalyticsService = ServiceFactory.getAnalyticsService();
      const FirebaseService = ServiceFactory.getFirebaseService();
      const sessionInfo = AnalyticsService.getSessionInfo();
      if (!sessionInfo.isInitialized || !sessionInfo.userId) {
        console.log(
          "⚠️ Analytics not initialized, attempting to initialize..."
        );
        try {
          await AnalyticsService.initialize();
          console.log("✅ Analytics initialized for feedback submission");
        } catch (error) {
          console.error("❌ Failed to initialize analytics:", error);
          Alert.alert(
            "Error",
            "Failed to initialize analytics. Please try again."
          );
          return;
        }
      }

      // Use persistent device ID to ensure consistency
      const FeedbackNotificationService = (
        await import("../services/FeedbackNotificationService")
      ).FeedbackNotificationService;
      const deviceId =
        await FeedbackNotificationService.getPersistentDeviceId();

      // Submit feedback only (rating is handled separately)
      const feedbackData: any = {
        userId: deviceId,
        sparkId,
        sparkName,
        rating: 0, // No rating for feedback-only submissions
        sessionId: sessionInfo.sessionId,
        platform: "ios" as "ios" | "android" | "web",
        comment: "", // Ensure comment is not undefined
        feedback: feedback.trim() || "", // Ensure feedback is not undefined
      };

      await FeedbackService.submitFeedback(feedbackData);
      console.log("✅ Feedback submitted successfully");

      // Track analytics
      await AnalyticsService.trackFeatureUsage(
        "feedback_submitted",
        sparkId,
        sparkName,
        {
          rating: 0,
          hasFeedback: !!feedback.trim(),
        }
      );

      // Track with simple analytics
      const SimpleAnalytics = ServiceFactory.getAnalyticsService();
      if (SimpleAnalytics.trackFeedbackSubmitted) {
        SimpleAnalytics.trackFeedbackSubmitted(sparkId, sparkName, false, true);
      }
      console.log("✅ Analytics tracked");

      // Reload feedback list
      await loadUserFeedback();

      Alert.alert(
        "Thank You!",
        "Your feedback has been submitted successfully."
      );
    } catch (error) {
      console.error("Error submitting feedback:", error);
      throw error;
    }
  };

  const handleRatingSubmit = async (rating: number) => {
    try {
      console.log("🚀 SettingsFeedbackSection: Starting rating submission...", {
        rating,
        sparkId,
        sparkName,
      });

      // Ensure services are initialized with retry logic
      let initAttempts = 0;
      const maxAttempts = 3;
      let initialized = false;

      while (initAttempts < maxAttempts && !initialized) {
        try {
          console.log(
            `🔄 Attempt ${
              initAttempts + 1
            }/${maxAttempts}: Initializing services...`
          );
          await ServiceFactory.ensureAnalyticsInitialized();
          await ServiceFactory.ensureFirebaseInitialized();

          // Verify initialization
          const FirebaseService = ServiceFactory.getFirebaseService();
          if (!FirebaseService) {
            throw new Error(
              "Firebase service not available after initialization"
            );
          }

          initialized = true;
          console.log("✅ Services initialized successfully");
        } catch (error) {
          initAttempts++;
          console.error(
            `❌ Initialization attempt ${initAttempts} failed:`,
            error
          );

          if (initAttempts < maxAttempts) {
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, 500 * initAttempts)
            );
          } else {
            throw new Error(
              `Failed to initialize services after ${maxAttempts} attempts: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      }

      const AnalyticsService = ServiceFactory.getAnalyticsService();
      const FirebaseService = ServiceFactory.getFirebaseService();

      // Use persistent device ID to ensure consistency
      const FeedbackNotificationService = (
        await import("../services/FeedbackNotificationService")
      ).FeedbackNotificationService;
      const deviceId =
        await FeedbackNotificationService.getPersistentDeviceId();
      console.log("⭐ Submitting rating for user:", deviceId);

      // Submit rating only
      const sessionInfo = AnalyticsService.getSessionInfo();
      const feedbackData = {
        userId: deviceId,
        sparkId,
        sparkName,
        rating,
        sessionId: sessionInfo.sessionId || deviceId,
        platform: "ios" as "ios" | "android" | "web",
        comment: "", // Ensure comment is not undefined to prevent Firebase error
        feedback: "", // Also set feedback to empty string just in case
      };

      console.log("📤 Submitting feedback data:", feedbackData);
      await FeedbackService.submitFeedback(feedbackData);
      console.log("✅ Rating submitted to Firebase successfully");

      // Track with simple analytics
      const SimpleAnalytics = ServiceFactory.getAnalyticsService();
      if (SimpleAnalytics.trackFeedbackSubmitted) {
        SimpleAnalytics.trackFeedbackSubmitted(sparkId, sparkName, true, false);
      }
      console.log("✅ Rating tracked in analytics");

      // Track analytics
      await AnalyticsService.trackFeatureUsage(
        "rating_submitted",
        sparkId,
        sparkName,
        {
          rating,
          hasFeedback: false,
        }
      );
      console.log("✅ Feature usage tracked");

      // Reload feedback list
      await loadUserFeedback();
      console.log("✅ Feedback list reloaded");

      HapticFeedback.success();
      Alert.alert(
        "Thank You!",
        `Your ${rating}-star rating has been recorded.`
      );
    } catch (error) {
      console.error("❌ Error submitting rating:", error);
      console.error(
        "❌ Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      // Provide detailed error message to user
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert(
        "Error",
        `Failed to submit rating. Please try again.\n\nDetails: ${errorMessage}`,
        [{ text: "OK" }]
      );
    }
  };

  const styles = StyleSheet.create({
    section: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 15,
    },
    appRatingContainer: {
      alignItems: "center",
      marginBottom: 20,
      paddingVertical: 20,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderRadius: 8,
      minHeight: 80,
    },
    appRatingLabel: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
    },
    feedbackButton: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 16,
    },
    feedbackButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    feedbackList: {
      marginTop: 8,
    },
    emptyState: {
      textAlign: "center",
      color: colors.textSecondary,
      fontSize: 14,
      fontStyle: "italic",
    },
  });

  return (
    <SettingsSection title="Feedback & Rating">
      {/* App Rating */}
      <View style={styles.appRatingContainer}>
        <Text style={styles.appRatingLabel}>Rate {sparkName}</Text>
        <StarRating
          rating={0}
          onRatingChange={(rating) => {
            if (rating > 0) {
              handleRatingSubmit(rating);
            }
          }}
          size={18}
        />
      </View>

      {/* Submit Feedback Button */}
      <TouchableOpacity
        style={styles.feedbackButton}
        onPress={() => setShowFeedbackModal(true)}
      >
        <Text style={styles.feedbackButtonText}>💬 Share Feedback</Text>
      </TouchableOpacity>

      {/* Mark as Read Button - only show if there are unread responses */}
      {unreadCount > 0 && (
        <SettingsButton
          title={`Mark ${unreadCount} Response${
            unreadCount > 1 ? "s" : ""
          } as Read`}
          onPress={async () => {
            try {
              const deviceId =
                await FeedbackNotificationService.getPersistentDeviceId();
              await FeedbackNotificationService.markAllResponsesAsRead(
                deviceId,
                sparkId
              );

              // Reload unread count
              const newCount = await FeedbackNotificationService.getUnreadCount(
                deviceId,
                sparkId
              );
              setUnreadCount(newCount);

              // Refresh feedback list to show updated status
              await loadUserFeedback();

              HapticFeedback.success();
              Alert.alert("Success", "All responses marked as read");
            } catch (error) {
              console.error("Error marking as read:", error);
              Alert.alert("Error", "Failed to mark responses as read");
            }
          }}
          variant="secondary"
        />
      )}

      {/* Feedback List */}
      {userFeedbacks.length > 0 && (
        <View style={styles.feedbackList}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <Text style={styles.sectionTitle}>Your Feedback</Text>
            <View style={{ marginLeft: 8 }}>
              <NotificationBadge sparkId={sparkId} size="small" />
            </View>
          </View>
          {userFeedbacks.map((item, index) => {
            const handleMarkAsRead = async (feedbackId: string) => {
              try {
                const deviceId =
                  await FeedbackNotificationService.getPersistentDeviceId();

                // Immediately update local state to hide button
                setUserFeedbacks((prevFeedbacks) =>
                  prevFeedbacks.map((fb) =>
                    fb.id === feedbackId ? { ...fb, readByUser: true } : fb
                  )
                );

                // Mark as read in Firebase and clear from pending responses
                await FeedbackNotificationService.markResponseAsRead(
                  deviceId,
                  feedbackId
                );

                // Reload feedback list to ensure sync with Firebase
                await loadUserFeedback();

                // Update unread count
                const newCount =
                  await FeedbackNotificationService.getUnreadCount(
                    deviceId,
                    sparkId
                  );
                setUnreadCount(newCount);

                HapticFeedback.success();
              } catch (error) {
                console.error("Error marking feedback as read:", error);
                // Revert on error
                await loadUserFeedback();
                Alert.alert("Error", "Failed to mark response as read");
              }
            };

            return (
              <FeedbackItem
                key={item.id || index}
                rating={item.rating}
                comment={item.comment || item.text || ""}
                response={item.response || ""}
                createdAt={item.createdAt}
                feedbackId={item.id}
                readByUser={item.readByUser}
                onMarkAsRead={handleMarkAsRead}
              />
            );
          })}
        </View>
      )}

      {!isLoading && userFeedbacks.length === 0 && (
        <Text style={styles.emptyState}>No feedback submitted yet</Text>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        sparkName={sparkName}
        sparkId={sparkId}
        onSubmit={handleSubmitFeedback}
      />
    </SettingsSection>
  );
});
