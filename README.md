# SparksApp

SparksApp is a mobile application featuring a collection of micro-experiences ("sparks") - interactive, vibe-coded experiences like spin the wheel, flashcards, and business simulations. Built with React Native and Expo, it offers a modular platform for small, engaging utilities.

Check out https://sparks.febak.com/check-out-the-sparks-app for details, including links to download the app on Google Play and the App Store.

## Features

*   **Modular "Sparks"**: 24+ independent micro-apps across multiple categories:
    *   **Productivity**: Todo List, Packing List, Minute Minder, Trip Survey, Coming Up
    *   **Education**: Spanish Flashcards, Spanish Friend (Amigo), Spanish Reader
    *   **Media**: Toview (movies/books/shows), Short Saver (YouTube), Song Saver (Spotify), Sound Board
    *   **Golf**: Golf Brain, Tee Time Timer, Golf Wisdom
    *   **Health**: FoodCam, Weight Tracker, Final Clock
    *   **Utility**: Decision Spinner, Quick Convert, CardScore, Share Sparks
    *   **Travel**: TripStory
    *   **Games**: Business Simulator, Buzzy Bingo
    *   **Community**: Spark Wizard (submit your own ideas)
*   **Marketplace**: Browse and manage your collection of Sparks.
*   **Theming**: Full dark/light mode support across all sparks.
*   **Persistence**: Data saved locally via AsyncStorage.
*   **Settings System**: Comprehensive settings for each spark with feedback integration.
*   **Cross-platform**: iOS, Android, and Web support via Expo.

## Getting Started

### Prerequisites

*   Node.js (v18+)
*   npm or yarn
*   Expo Go app on your mobile device (optional, for testing)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/dyor/SparksApp.git
    cd SparksApp
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    *   Create a `.env` file in the project root with your Firebase configuration:
        ```bash
        EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
        EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
        EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
        EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
        EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
        EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
        EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
        ```
    *   Get these values from Firebase Console (Project Settings > General > Your apps > Web app)
    *   You will need to create a Firebase project and enable Firestore and Authentication (Anonymous).
    *   **Important:** All Firebase environment variables must use the `EXPO_PUBLIC_` prefix.

4.  **Start the app**
    ```bash
    npx expo start
    ```
    *   Scan the QR code with Expo Go (Android) or the Camera app (iOS).
    *   Press `w` to run in the web browser.

## Project Structure

*   `src/sparks/`: Individual Spark implementations.
*   `src/components/`: Shared UI components.
*   `src/services/`: Shared services (Firebase, Analytics).
*   `src/screens/`: Main app screens (My Sparks, Marketplace).
*   `src/types/`: TypeScript definitions.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and suggest improvements.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
