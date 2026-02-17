# Skill: Shared Services

This skill guides the agent in leveraging shared services to implement business logic, interact with backend systems, and perform common tasks. Reusing services is critical for stability, maintainability, and reducing redundant code.

## 1. Guiding Principles

*   **Single Responsibility**: Each service should have a clear and focused purpose (e.g., authentication, analytics, remote configuration).
*   **Decoupling**: Services help decouple Sparks from the underlying implementation details (e.g., a Spark uses `GeminiService` without needing to know about the API key hierarchy).
*   **Reusability**: Always check for an existing service before writing new implementation logic.
*   **Factory-Managed**: Services should be accessed via the `ServiceFactory` (`src/services/ServiceFactory.ts`) to ensure proper initialization and singleton instances where appropriate.

## 2. How to Use Shared Services

1.  **Identify the Task**: Determine the required functionality (e.g., run a Gemini prompt, log an event, get a remote config value).
2.  **Consult the Service List**: Review the "Existing Shared Services" section below to find the appropriate service.
3.  **Use the Service Factory**: Import `ServiceFactory` and get the service instance (e.g., `const geminiService = ServiceFactory.getGeminiService();`).
4.  **Call Service Methods**: Use the methods provided by the service to perform the task.

## 3. How to Create a New Service

1.  **Verify Necessity**: Confirm that the required functionality cannot be logically added to an existing service.
2.  **Define the Interface**: Create a new file in `src/services/` (e.g., `NewService.ts`). Define the class and its public methods.
3.  **Implement the Logic**: Write the service's implementation.
4.  **Integrate with Service Factory**: Add the new service to `src/services/ServiceFactory.ts`. This may involve adding a getter and initializing the service in the factory's constructor or on-demand.
5.  **Update this Skill**: Add the new service to the list below.

## 4. Existing Shared Services

This is a non-exhaustive list of key services available through the `ServiceFactory`.

### Core Services
*   **`GeminiService.ts`**: The primary service for all interactions with the Google Gemini AI. Use this for generating content and JSON.
*   **`AnalyticsService.ts`**: For logging analytics events. The `ServiceFactory` provides the correct implementation (e.g., `FirebaseAnalyticsService` or `MockAnalyticsService`).
*   **`RemoteConfigService.ts`**: For fetching remotely configured values, such as the default Gemini API key.
*   **`AuthService.ts`**: Handles all user authentication logic, including sign-in, sign-out, and session management.

### Notification & Feedback
*   **`FeedbackNotificationService.ts`**: A system-wide service for displaying notifications and feedback to the user.
*   **`FriendInvitationNotificationService.ts`**: A specialized notification service for friend invitations.

### Data & Storage
*   **`FirebaseService.ts`**: Provides access to Firebase services like Firestore.
*   **`DreamStorageService.ts`**, **`RecordSwingStorageService.ts`**: Examples of specialized storage services for specific Sparks.

### Spark-Specific Services
*   **`GolfWisdomAdminService.ts`**, **`SparkSubmissionAdminService.ts`**: Services built for administrative functions for specific sparks.
*   **`CommandExecutor.ts`**, **`GeminiCommandParser.ts`**: Services used by the "SpeakSpark" for voice commands.
