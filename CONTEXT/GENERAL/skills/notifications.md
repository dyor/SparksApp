# Skill: Notifications & Feedback

This skill covers the correct use of the application's system-wide feedback and notification service.

## 1. The `FeedbackNotificationService`

For all in-app notifications, use the `FeedbackNotificationService`. This ensures a consistent presentation and behavior for all feedback messages shown to the user.

*   **Location**: `src/services/FeedbackNotificationService.ts`
*   **Access**: Use the service factory: `ServiceFactory.getFeedbackNotificationService()`

## 2. Key Characteristics

*   **Manual Clearing**: A crucial design choice in this app is that notifications are **not** automatically cleared when viewed. The user must manually dismiss them. Do not implement any logic that attempts to auto-dismiss notifications.

## 3. How to Use

1.  **Get the Service**: Obtain an instance of the service from the `ServiceFactory`.
2.  **Call Methods**: Use the methods on the service to show, hide, or update notifications. Refer to the method definitions in the service file for specific usage.
