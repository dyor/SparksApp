# Skill: AI Integration (Gemini)

This skill provides guidelines for integrating features powered by Google's Gemini models into Sparks. To ensure consistency, maintainability, and proper API key management, all AI-related operations must go through the central `GeminiService`.

## 1. The Golden Rule: Use `GeminiService`

All interactions with the Gemini API **must** be handled by `GeminiService.ts`. Do not make direct calls to the Gemini API from your Spark.

*   **Location**: `src/services/GeminiService.ts`
*   **Access**: Use the service factory: `ServiceFactory.getGeminiService()`

## 2. Core Service Methods

*   **`generateContent(prompt: string, images: string[] = [])`**: For generating text-based content from a prompt, optionally with images.
*   **`generateJSON<T>(prompt: string, images: string[] = [])`**: For generating structured JSON output. This is the preferred method for getting predictable, parsable data from the model.

## 3. API Key Management

`GeminiService` automatically handles the API key resolution hierarchy. You do not need to manage this in your Spark. The service will use, in order of priority:
1.  The user's custom API key (if provided).
2.  The default key from Firebase Remote Config.
3.  The fallback key from the `.env` file.

**CRITICAL**: Never hardcode API keys or attempt to manage them outside of this system. Always use the `process.env.EXPO_PUBLIC_...` prefix for any new environment variables.

## 4. Known Issues

*   **Firebase SDK**: When working with backend services that might interact with the AI service, remember to use only the Firebase Web SDK. The native Firestore SDK has known compatibility issues in the current React Native setup.
