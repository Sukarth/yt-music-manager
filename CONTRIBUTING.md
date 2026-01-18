# Contributing to YT Music Manager

Thank you for considering contributing to YT Music Manager! This document provides guidelines and instructions for developers.

## Table of Contents

- [Development Setup](#development-setup)
- [Building from Source](#building-from-source)
- [Architecture](#architecture)
- [Code Guidelines](#code-guidelines)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Pull Requests](#pull-requests)

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Android Studio/gradle (for Android development)
- Xcode (for iOS development, macOS only)
- Git

### Installation

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/yt-music-manager.git
cd yt-music-manager
```

2. Install dependencies:

```bash
npm install
```

This automatically applies patches via `patch-package` (configured in `postinstall` script).

3. Configure backend URL (if not using default):

Update `src/constants/index.ts`:

```typescript
export const BACKEND_URL = 'https://your-backend-url.com';
```

4. (Optional) Configure Google OAuth:

Update `src/services/authService.ts`:

```typescript
const GOOGLE_WEB_CLIENT_ID = 'your-web-client-id.apps.googleusercontent.com';
```

Place `google-services.json` in project root (see [google-services.json.example](./google-services.json.example)).

### Running the App

> **Note**: This app uses native modules (`react-native-track-player`) and **cannot** run in the standard Expo Go app. You must build a **Development Client**.

#### Option 1: Development Build (Recommended)

This builds the native app locally and installs it on your Emulator or connected device.

```bash
# For Android (builds and runs on connected device/emulator)
npm run android

# For iOS (macOS only)
npm run ios
```

If you don't have an Android environment set up, you can use [EAS Build](https://docs.expo.dev/build/setup/):

```bash
eas build --profile development --platform android
```

#### Option 2: Production Build

To build a release version (APK/AAB) signed for installation/distribution, see [Building from Source](#building-from-source).

## Building from Source

### Android Production Build (Step-by-Step)

Follow this guide to go from a fresh git clone of this repository to a signed APK installable on your device.

#### 1. Setup & Installation

```bash
# Clone the repository
git clone https://github.com/Sukarth/yt-music-manager.git
cd yt-music-manager

# Install dependencies and apply patches
npm install
```

#### 2. App Configuration (Crucial)

Before building, you **must** configure the app to point to your services.

**A. Backend Service**
Open `src/constants/index.ts` and set your backend URL (if not using default):

```typescript
// Findings: src/constants/index.ts
export const BACKEND_URL = 'https://your-backend-url.com';
```

**B. Google OAuth (Optional but Recommended)**
To enable private playlist access:

1. Create a project in [Google Cloud Console](https://console.cloud.google.com).
2. Create **OAuth 2.0 Credentials**:
   - **Web Application**: Copy this "Client ID".
   - **Android**: You'll need your keystore's SHA-1 (see Step 3).
3. Download `google-services.json` from Firebase/Google Cloud and place it in the project root:
   ```
   yt-music-manager/google-services.json
   ```
4. Open `src/services/authService.ts` and paste your **Web Client ID**:
   ```typescript
   const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
   ```

#### 3. Generate Signing Keys

Android requires a digital signature. Generate a keystore file:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore release.keystore \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Follow the prompts. _Save the keystore file and passwords securely. You cannot update your app without them._

#### 4. Prepare Native Project

This command generates the `android/` folder with all native code and linking.

```bash
npx expo prebuild --platform android --clean
```

#### 5. Configure Signing Properties

Create or edit `android/gradle.properties` to tell the build system about your keystore.

> **Note**: Do NOT commit this file if it contains real passwords.

Add the following lines to `android/gradle.properties`:

```properties
MYAPP_UPLOAD_STORE_FILE=../release.keystore
MYAPP_UPLOAD_KEY_ALIAS=upload
MYAPP_UPLOAD_STORE_PASSWORD=your_keystore_password
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

#### 6. Build the APK

Compile the release version:

```bash
cd android
./gradlew assembleRelease
```

**Output**: The signed APK will be at:
`android/app/build/outputs/apk/release/app-release.apk`

Transfer this file to your Android device to install.

---

### GitHub Actions Build (Automated)

Instead of building locally, you can use GitHub Actions (configured in `.github/workflows/ci.yml`).

1. **Encode Key**: Base64 encode your keystore: `base64 -i release.keystore -o keystore_base64.txt`
2. **Set Secrets**: Go to Repo Settings > Secrets and add:
   - `KEYSTORE_BASE64` (Content of txt file)
   - `KEY_ALIAS`
   - `KEYSTORE_PASSWORD`
   - `KEY_PASSWORD`
3. **Push**: Pushing to the `main` branch triggers the build.
4. **Download**: Get the APK from the "Actions" tab artifacts.

### iOS

1. Generate native iOS project:

```bash
npx expo prebuild --platform ios --clean
```

2. Open in Xcode:

```bash
open ios/ytmusicmanager.xcworkspace
```

3. Configure signing in Xcode (requires Apple Developer account)

4. Build and archive for distribution

## Architecture

### Application Structure

```
App.tsx (Root)
  └── AppContext (State Provider)
      └── Navigation Container
          ├── Stack Navigator
          └── Tab Navigator
              ├── Home Screen
              ├── My Playlists Screen
              └── Settings Screen
```

### State Management

Global state managed via Context API with reducer pattern:

```typescript
// State
{
  playlists: Playlist[]
  tracks: Track[]
  settings: AppSettings
  auth: AuthState
  downloadQueue: DownloadQueueItem[]
}

// Actions
ADD_PLAYLIST
REMOVE_PLAYLIST
UPDATE_TRACK
SET_SETTINGS
SET_AUTH
```

### Service Layer

- **youtubeApi.ts**: YouTube Data API integration (fetch playlist info, videos)
- **downloadService.ts**: Download management (download tracks, create M3U, manage SAF URIs)
- **authService.ts**: Google OAuth authentication
- **playerService.ts**: React Native Track Player integration

### Data Flow Example: Adding a Playlist

1. User enters YouTube URL in AddPlaylistScreen
2. `usePlaylistManager` hook validates URL
3. `youtubeApi.getPlaylistInfo()` fetches playlist metadata
4. `youtubeApi.getPlaylistVideos()` fetches all videos
5. Dispatch `ADD_PLAYLIST` and `ADD_TRACKS` actions
6. State persisted to AsyncStorage
7. UI updates with new playlist

### Storage

- **AsyncStorage**: Playlists, tracks, settings, app state
- **SecureStore**: OAuth tokens (encrypted)
- **File System**: Downloaded MP3 files, M3U playlists

File structure:

```
{documentDirectory}/YTMusicManager/
├── Playlist 1/
│   ├── Track 1.mp3
│   ├── Track 2.mp3
│   └── Playlist 1.m3u
└── Playlist 2/
    └── ...
```

## Code Guidelines

### TypeScript

- Use TypeScript for all code
- Define interfaces and types in `src/types/index.ts`
- Avoid `any` type
- Use strict mode

### React/React Native

- Use functional components with hooks
- Keep components focused and small
- Memoize with `React.memo`, `useMemo`, `useCallback` when appropriate
- Avoid unnecessary re-renders

### Naming Conventions

- Components: PascalCase (`PlaylistCard.tsx`)
- Files: PascalCase for components, camelCase for utilities
- Variables/Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase

### Code Formatting

```bash
# Format code
npm run format

# Lint
npm run lint
npm run lint:fix

# Type check
npm run typecheck
```

- 2 spaces indentation
- Single quotes for strings
- Trailing commas
- No unused imports

### Commit Messages

Format: `type(scope): subject`

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style/formatting
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

Examples:

```
feat(playlist): add search functionality
fix(download): resolve race condition in concurrent downloads
docs(readme): update installation instructions
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Writing Tests

- Write tests for all new features
- Target >70% code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

Test structure:

```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Arrange
    const props = { ... };

    // Act
    const { getByText } = render(<Component {...props} />);

    // Assert
    expect(getByText('Expected Text')).toBeTruthy();
  });
});
```

### Test Files

- Unit tests: `src/**/__tests__/*.test.ts(x)`
- Component tests: `src/components/__tests__/*.test.tsx`
- Integration tests: Test service interactions

## Troubleshooting

### Installation Issues

**Dependencies not installing:**

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Expo CLI not found:**

```bash
npm install -g expo-cli
# or use npx
npx expo start
```

### Build Issues

**Android build fails:**

```bash
cd android
./gradlew clean
cd ..
expo start -c
```

**iOS build fails (macOS):**

```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Gradle errors:**

Ensure Java 17 (JDK 17) is installed (required for React Native 0.73+):

```bash
java -version
```

### Runtime Issues

**App crashes on startup:**

1. Check logs:

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

2. Clear cache:

```bash
expo start -c
```

3. Reinstall dependencies

**White screen:**

- Check for JavaScript errors in console
- Verify `App.tsx` exports correctly
- Clear cache and restart

### Authentication Issues

**Google Sign-In fails:**

- Verify `GOOGLE_WEB_CLIENT_ID` is correct in `src/services/authService.ts`
- Ensure `google-services.json` is in project root
- Check SHA-1 certificate matches in Google Cloud Console:

```bash
# Debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release keystore
keytool -list -v -keystore path/to/release.keystore -alias your-alias
```

- Verify redirect URIs in Google Console include:
  - `ytmusicmanager://`
  - `com.sukarth.ytmusicmanager:/oauth2redirect`

**"Access blocked: Authorization Error":**

This means redirect URI is not configured in Google Cloud Console. Add the redirect URIs above.

### Download Issues

**Downloads fail:**

- Verify backend URL is correct and accessible
- Check network connectivity
- Test backend health: `curl https://your-backend-url.com/health`
- Check Android storage permissions

**Downloads stuck:**

- Check concurrent download limit in settings
- Cancel and retry
- Clear download queue

### Storage Issues

**"Insufficient storage":**

```typescript
// Check available space
import * as FileSystem from 'expo-file-system';
const info = await FileSystem.getFreeDiskStorageAsync();
console.log('Free space:', info);
```

**Permission denied (Android):**

- Request storage permission at runtime
- Use Storage Access Framework for Android 10+
- Check `AndroidManifest.xml` has required permissions

### Performance Issues

**Slow scrolling:**

Optimize FlatList:

```typescript
<FlatList
  data={items}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

**High memory usage:**

- Profile with React DevTools
- Check for memory leaks (unremoved listeners)
- Optimize image caching

## Pull Requests

### Before Submitting

1. Ensure all tests pass: `npm test`
2. Run linting: `npm run lint`
3. Format code: `npm run format`
4. Type check: `npm run typecheck`
5. Update documentation if needed
6. Rebase on latest `main` branch

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

Describe testing performed

## Checklist

- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. Automated CI/CD checks must pass
2. At least one maintainer review required
3. Address review comments
4. Maintainer merges when approved

## Code Review Guidelines

### For Authors

- Keep PRs focused and small
- Provide context in description
- Respond promptly to comments
- Test thoroughly

### For Reviewers

- Be constructive and respectful
- Focus on code quality and maintainability
- Check test coverage
- Verify documentation

## Security

- Never commit sensitive data (tokens, passwords, API keys)
- Use SecureStore for sensitive data
- Sanitize user inputs
- Use HTTPS for all requests
- Follow OWASP guidelines

## Performance Considerations

- Avoid unnecessary re-renders
- Use virtualization for large lists
- Lazy load heavy components
- Monitor bundle size
- Profile regularly

## Release Process

### Versioning

Follow [Semantic Versioning](https://semver.org/):

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

### Release Checklist

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Build and test on both platforms
5. Create Git tag
6. Push to GitHub
7. Create GitHub Release
8. Upload APK/AAB artifacts

## Community

### Getting Help

- GitHub Issues for bugs and feature requests
- Check existing documentation
- Search closed issues

### Communication

- Be respectful and professional
- Stay on topic
- Help others when possible
- Follow project guidelines

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue with the `question` label.

Thank you for contributing to YT Music Manager!
