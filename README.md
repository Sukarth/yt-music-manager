# YT Music Manager - Mobile App

A production-ready React Native mobile application for managing and downloading YouTube Music playlists on iOS and Android devices.

## Features

### Core Functionality

- **Playlist Management**: Add, remove, and organize YouTube Music playlists
- **Smart Download System**: Download playlists in MP3 format with configurable quality
- **Sync Mechanism**: Keep playlists up-to-date with automatic sync
- **Background Sync**: Auto-sync playlists even when app is closed
- **Music Player**: Built-in player with playback controls
- **Storage Management**: Monitor and manage downloaded music storage
- **Search & Filter**: Find playlists and tracks quickly
- **M3U Export**: Generate M3U playlists for external players

### Authentication

- Google OAuth Sign-In for private playlists
- Public playlist support without authentication
- Secure token storage with encryption

### Settings & Customization

- Audio quality selection (128-320 kbps)
- Concurrent download configuration
- Auto-sync interval customization
- Dark mode support
- Storage cleanup options

## Tech Stack

- **Framework**: React Native with Expo (Managed Workflow)
- **Language**: TypeScript
- **UI Library**: React Native Paper (Material Design)
- **Navigation**: React Navigation v7
- **State Management**: React Context API + Hooks
- **Storage**: AsyncStorage + Expo SecureStore
- **Audio**: Expo AV
- **Testing**: Jest + React Native Testing Library
- **Linting**: ESLint + Prettier

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator
- Expo Go app (for testing on physical devices)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd yt-music-manager
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment (optional):

```bash
# Update src/services/authService.ts with your Google OAuth Client ID
GOOGLE_CLIENT_ID='your-google-client-id'
```

## Development

### Running the App

Start the development server:

```bash
npm start
```

Run on specific platforms:

```bash
npm run android  # Android
npm run ios      # iOS (macOS only)
npm run web      # Web (limited functionality)
```

### Code Quality

Run linter:

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

Format code:

```bash
npm run format
```

Type checking:

```bash
npm run typecheck
```

### Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Watch mode:

```bash
npm run test:watch
```

## Project Structure

```
yt-music-manager/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Generic components
│   │   ├── playlist/        # Playlist-specific components
│   │   └── player/          # Music player components
│   ├── screens/             # Screen components
│   │   ├── Home/            # Home screen
│   │   ├── AddPlaylist/     # Add playlist screen
│   │   ├── PlaylistDetail/  # Playlist detail screen
│   │   ├── Settings/        # Settings screen
│   │   ├── Player/          # Music player screen
│   │   └── Sync/            # Sync preview screen
│   ├── navigation/          # Navigation configuration
│   ├── services/            # API and business logic services
│   │   ├── youtubeApi.ts    # YouTube API integration
│   │   ├── downloadService.ts # Download management
│   │   └── authService.ts   # Authentication
│   ├── store/               # State management
│   │   └── AppContext.tsx   # Global app state
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript type definitions
│   └── constants/           # App constants
├── assets/                  # Images and static files
├── __tests__/              # Test files
├── App.tsx                 # Root component
├── app.json                # Expo configuration
├── tsconfig.json           # TypeScript configuration
├── jest.config.js          # Jest configuration
├── .eslintrc.js            # ESLint configuration
└── .prettierrc.js          # Prettier configuration
```

## Building for Production

### Android (APK/AAB)

1. Install EAS CLI:

```bash
npm install -g eas-cli
```

2. Configure EAS:

```bash
eas build:configure
```

3. Build APK:

```bash
eas build --platform android --profile preview
```

4. Build for Play Store:

```bash
eas build --platform android --profile production
```

### iOS (IPA)

1. Configure Apple Developer account in EAS

2. Build for iOS:

```bash
eas build --platform ios --profile production
```

### Build Profiles

Build profiles are configured in `eas.json`:

- **development**: Development builds with debugging
- **preview**: APK builds for testing
- **production**: Optimized production builds

## Configuration

### App Configuration (app.json)

Key settings in `app.json`:

- Bundle identifiers
- App name and version
- Permissions
- Splash screen and icons
- Platform-specific settings

### Environment Variables

For production, set the following:

- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- YouTube API key (if needed for public playlists)

## API Integration

### YouTube API

The app uses YouTube Data API v3 for:

- Fetching playlist information
- Retrieving video details
- Syncing playlist changes

**Note**: For production, you'll need to implement a backend bridge service for yt-dlp integration to download actual audio files. The current implementation includes placeholder URLs in `downloadService.ts`.

### Recommended Backend Setup

1. Create a Node.js/Python backend with yt-dlp
2. Expose REST API for download requests
3. Update `getDownloadUrl()` in `downloadService.ts`
4. Implement authentication and rate limiting

## Deployment

### App Store (iOS)

1. Build production IPA
2. Upload to App Store Connect
3. Configure app metadata
4. Submit for review

### Google Play Store (Android)

1. Build production AAB
2. Create app in Play Console
3. Upload AAB and configure store listing
4. Submit for review

## Troubleshooting

### Common Issues

**Build Failures**:

- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Reset Metro bundler: `npx react-native start --reset-cache`

**iOS Issues**:

- Run `pod install` in `ios/` directory
- Clean build: `cd ios && xcodebuild clean`

**Android Issues**:

- Clean Gradle: `cd android && ./gradlew clean`
- Clear build cache: `cd android && ./gradlew cleanBuildCache`

### Debug Mode

Enable React Native debugging:

1. Shake device (physical) or Cmd+D (iOS) / Cmd+M (Android)
2. Select "Debug" from menu
3. Open Chrome DevTools

## Testing Strategy

### Unit Tests

- Utility functions
- Service logic
- State management

### Component Tests

- UI component rendering
- User interactions
- Props validation

### Integration Tests

- API integration
- Navigation flows
- Data persistence

### E2E Tests (Optional)

- Complete user workflows
- Critical paths testing
- Cross-platform validation

## Performance Optimization

- Lazy loading for screens
- Optimized image loading
- Efficient state updates
- Debounced search
- Concurrent download management
- Background task optimization

## Security

- Secure token storage (Expo SecureStore)
- HTTPS for all API requests
- Input validation and sanitization
- No sensitive data in logs
- Proper permission handling

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

### Code Style Guidelines

- Follow TypeScript best practices
- Use functional components with hooks
- Write meaningful commit messages
- Add tests for new features
- Update documentation

## License

This project is licensed under the MIT License.

## Support

For issues and questions:

- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

## Roadmap

### Future Enhancements

- [ ] Offline mode improvements
- [ ] Playlist sharing
- [ ] Social features
- [ ] Advanced audio controls
- [ ] Multiple quality downloads
- [ ] Playlist analytics
- [ ] Export to other formats
- [ ] Cloud backup integration

## Acknowledgments

- React Native community
- Expo team
- React Navigation
- React Native Paper
- All open-source contributors

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-02
