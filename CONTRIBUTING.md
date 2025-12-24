# Contributing to SparksApp

Thank you for your interest in contributing to Sparks! We welcome contributions from the community to help make this project better.

## Three Ways to Contribute

### 1. Using the Spark Wizard (In-App) - Easiest
The most user-friendly way to contribute is directly through the Sparks app interface.

1. **Install the App:**
   * **Android:** [Google Play Store ↗](https://play.google.com/store/apps/details?id=com.mattdyor.sparks)
   * **iOS:** [iOS App Store ↗](https://apps.apple.com/us/app/get-sparks/id6752919846)
2. **Open the Wizard:** Navigate to the **Spark Wizard** within the app.
3. **Create:** Follow the step-by-step prompts to define your spark's content.
4. **Submit:** Submit your spark for review directly through the app.

> **Note:** The Spark Wizard is designed for a seamless, no-code experience.

---

### 2. Using GitHub Codespaces - Recommended for Developers
Use a pre-configured cloud environment to add sparks via the codebase without any local setup.

1. **Create a Codespace:** Click [this link](https://github.com/codespaces/new?skip_quickstart=true&machine=standardLinux32gb&repo=1048220194&ref=main&devcontainer_path=.devcontainer%2Fdevcontainer.json&geo=UsWest) to launch the environment.
2. **Edit with Agent:** Use the built-in Copilot/AI agent to help generate or modify the spark files.
   * *Tip:* You can tell the Agent to build a new spark based on an existing one but with the changes you want.
3. **Preview Your Change:** In the terminal, run `npx expo start --web --tunnel`
4. **Submit a PR:** Open the Source Control tab, commit your changes, and click "Create Pull Request".

---

### 3. Forking the Repository - Traditional Git Workflow
For developers who prefer a traditional Git workflow.

1. **Fork the Repository**: Click the "Fork" button on the top right of the [repository page](https://github.com/dyor/SparksApp).
2. **Clone your Fork**:
   ```bash
   git clone https://github.com/<your-username>/SparksApp.git
   cd SparksApp
   ```
3. **Create a Branch**: Create a new branch for your feature or fix.
   ```bash
   git checkout -b feature/my-new-spark
   ```
4. **Make Changes**: Implement your changes. Ensure your code follows the project's style and conventions.
5. **Test**: Run the app locally to verify your changes work as expected.
   ```bash
   npm run lint
   npx expo start
   ```
6. **Commit**: Commit your changes with a descriptive message.
   ```bash
   git commit -m "feat: add Hangman spark"
   ```
7. **Push**: Push your branch to your fork.
   ```bash
   git push origin feature/my-new-spark
   ```
8. **Open a Pull Request**: Go to the original repository and open a Pull Request from your fork. Provide a clear description of your changes.

---

## Pull Request Guidelines

> **Important:** Each PR should either improve a **single** existing Spark or create a **new** Spark. Changes spanning multiple Sparks will likely be rejected.

### What We Accept
- ✅ New spark implementations
- ✅ Improvements to existing sparks (bug fixes, features, UI enhancements)
- ✅ Documentation improvements
- ✅ Bug fixes in core app functionality

### What We Reject
- ❌ PRs that modify multiple unrelated sparks
- ❌ Breaking changes without discussion
- ❌ Code that doesn't follow our style guidelines
- ❌ Incomplete implementations

## Code Style

* We use **TypeScript** for type safety.
* We use **Prettier** for code formatting. Please run `npm run format` before committing.
* We use **ESLint** for linting. Please run `npm run lint` to check for issues.

## Adding a New Spark

If you are adding a new Spark:

1. **Create Spark Files**: Create a new file in `src/sparks/` (e.g., `src/sparks/HangmanSpark.tsx`).
2. **Implement Component**: Build your spark following existing patterns.
3. **Add Settings**: Create a settings page following [CONTEXT/GENERAL/SETTINGSDESIGN.md](CONTEXT/GENERAL/SETTINGSDESIGN.md).
4. **Register Spark**: Add your spark to `src/components/sparkRegistryData.tsx`:
   ```typescript
   import { HangmanSpark } from '../sparks/HangmanSpark';
   
   // In sparkRegistry object:
   'hangman': {
     metadata: {
       id: 'hangman',
       title: 'Hangman',
       description: 'Classic word guessing game for 1-4 players',
       icon: '🎮',
       category: 'game',
       createdAt: '2025-12-23T00:00:00.000Z',
       rating: 4.5,
     },
     component: HangmanSpark,
   },
   ```
5. **Test Thoroughly**: Ensure your spark works on iOS, Android, and Web.

### Settings Page Requirements

All sparks **must** include a settings page with:
- ✅ Feedback section (using `SettingsFeedbackSection`)
- ✅ Star rating system
- ✅ Spark-specific configuration options (if any)
- ✅ Save/Cancel or Close button

See [CONTEXT/GENERAL/SETTINGSDESIGN.md](CONTEXT/GENERAL/SETTINGSDESIGN.md) for detailed guidelines.

## Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub.
* **Bugs**: Describe the issue in detail, including steps to reproduce, expected behavior, and screenshots if applicable.
* **Features**: Explain the proposed feature and its use case.

## Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

---

**Questions?** Open an issue or discussion on GitHub. We're here to help!
