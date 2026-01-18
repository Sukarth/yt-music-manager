# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-18

### Added

- Playlist management (add, sync, delete YouTube Music playlists)
- Offline downloads with configurable audio quality (128-320 kbps)
- Custom storage location support via Storage Access Framework (Android)
- Background auto-sync with configurable intervals
- Google OAuth authentication for private playlists
- Built-in music player with custom seekbar, queue management, and background playback
- M3U playlist file download for use with external players
- Storage usage monitoring and management
- Settings for quality, sync intervals, concurrent downloads, and theme
- Dark mode support
- GitHub Actions CI/CD for automated APK and AAB builds

### Technical

- React Native 0.81.5 with Expo SDK 54
- React Native Track Player for audio playback
- React Navigation v7
- TypeScript throughout
- Jest testing setup with 70%+ coverage target
- Custom Expo config plugin for Android release signing

[1.0.0]: https://github.com/Sukarth/yt-music-manager/releases/tag/v1.0.0
