# YT Music Manager

A React Native mobile app for downloading and managing (syncing) YouTube Music playlists for offline playback on Android and iOS.

## Features

- Playlist management (add, sync, delete YouTube Music playlists)
- Offline downloads with configurable audio quality (128-320 kbps M4A)
- Custom storage location support (Android Storage Access Framework)
- Smart sync with preview and duplicate detection
- Background auto-sync with configurable intervals
- Google OAuth authentication for private playlists
- Built-in music player with custom seekbar, queue management, and background playback
- M3U playlist file support for external players
- Storage monitoring and management
- Dark mode support

## Installation

### Download from Releases

1. Go to the [Releases](https://github.com/Sukarth/yt-music-manager/releases) page
2. Download the latest APK file (Android) or IPA file (iOS)
3. Install on your device

### Build from Source

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development setup and build instructions.

## Requirements

- Android 8.0+ or iOS 13+
- Backend server running (see: [yt-music-manager-backend](https://github.com/Sukarth/yt-music-manager-backend) which is hosted for free on Render, and connects to this app by default)
- Google account (optional, for accessing private playlists)

## Backend Setup

This app requires a backend server to download YouTube audio using the yt-dlp library. By default, it connects to a free hosted instance on Render from the [yt-music-manager-backend](https://github.com/Sukarth/yt-music-manager-backend) repository, but you can deploy your own if you wish for better reliability.

1. Deploy [yt-music-manager-backend](https://github.com/Sukarth/yt-music-manager-backend) to your preferred hosting service
2. Update the backend URL:
   - In the app: Go to Settings and enter your backend URL
   - Or before building: Update `BACKEND_URL` in `src/constants/index.ts`

## Usage

1. Launch the app
2. (Optional) Sign in with Google to access private playlists
3. Add playlists using YouTube playlist URLs
4. Download and sync playlists
5. Play music offline with the built-in player

## Google OAuth Configuration (Optional)

Required only if you want to access private YouTube playlists.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project and enable YouTube Data API v3
3. Create OAuth 2.0 credentials:
   - Web Client ID (for backend)
   - Android Client ID (for the app, using your app's SHA-1 fingerprint)
4. Download `google-services.json` and place in project root (for building)
5. Update `GOOGLE_WEB_CLIENT_ID` in `src/services/authService.ts` (for building)

See [google-services.json.example](./google-services.json.example) for structure reference.

## Tech Stack

- React Native 0.81.5 with Expo SDK 54
- TypeScript
- React Navigation v7
- React Native Track Player for audio playback
- Context API for state management
- AsyncStorage and SecureStore for data persistence

## License

MIT License. see [LICENSE](./LICENSE) file for more details.

## Contributing & Development

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines and all development info/instructions.

## Support

- Report issues on [GitHub Issues](https://github.com/Sukarth/yt-music-manager/issues)
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) for troubleshooting common issues

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and release notes.

---

<center>

Built with ❤️ by [Sukarth](https://github.com/Sukarth)
