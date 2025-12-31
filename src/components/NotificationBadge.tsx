import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { FeedbackNotificationService } from "../services/FeedbackNotificationService";
import { ServiceFactory } from "../services/ServiceFactory";

interface NotificationBadgeProps {
  sparkId?: string;
  size?: "small" | "medium" | "large";
  showZero?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  sparkId,
  size = "medium",
  showZero = false,
}) => {
  const { colors } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        let count = 0;

        // For golfWisdom spark, check GolfWisdomNotificationService
        if (sparkId === "golfWisdom") {
          try {
            const { GolfWisdomNotificationService } = await import(
              "../services/GolfWisdomNotificationService"
            );
            count = await GolfWisdomNotificationService.getUnreadCount();
          } catch (error) {
            console.error(
              "Error loading GolfWisdom notification count:",
              error
            );
          }
        } else if (sparkId === "friend-spark") {
          // For friend-spark, check FriendInvitationNotificationService
          try {
            const { FriendInvitationNotificationService } = await import(
              "../services/FriendInvitationNotificationService"
            );
            count = await FriendInvitationNotificationService.getUnreadCount();
          } catch (error) {
            console.error(
              "Error loading Friend invitation notification count:",
              error
            );
          }
        } else {
          // For other sparks, use FeedbackNotificationService
          const deviceId =
            await FeedbackNotificationService.getPersistentDeviceId();
          count = await FeedbackNotificationService.getUnreadCount(
            deviceId,
            sparkId
          );
        }

        setUnreadCount(count);
      } catch (error) {
        console.error("Error loading unread count:", error);
        setUnreadCount(0);
      }
    };

    loadUnreadCount();

    // Refresh count when component becomes visible
    const interval = setInterval(loadUnreadCount, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [sparkId]);

  if (unreadCount === 0 && !showZero) {
    return null;
  }

  const sizeStyles = {
    small: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      fontSize: 10,
    },
    medium: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      fontSize: 12,
    },
    large: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      fontSize: 14,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      pointerEvents="none"
      style={[
        styles.badge,
        {
          backgroundColor: colors.error || "#FF3B30",
          minWidth: currentSize.minWidth,
          height: currentSize.height,
          borderRadius: currentSize.borderRadius,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: colors.background,
            fontSize: currentSize.fontSize,
          },
        ]}
      >
        {unreadCount > 99 ? "99+" : unreadCount.toString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    zIndex: 1,
  },
  badgeText: {
    fontWeight: "600",
    textAlign: "center",
  },
});
