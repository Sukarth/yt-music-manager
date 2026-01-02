# YT Music Manager - Architecture Documentation

## Overview

YT Music Manager is a React Native mobile application built with Expo that enables users to download and manage YouTube Music playlists on iOS and Android devices.

## Architecture Principles

### 1. Component-Based Architecture
- Modular, reusable components
- Clear separation of concerns
- Single responsibility principle
- Props-based communication

### 2. State Management
- Context API for global state
- Local state for UI-specific data
- Persistent storage for data
- Optimistic updates for better UX

### 3. Service Layer
- Encapsulated business logic
- API communication abstraction
- Error handling and retries
- Singleton pattern for services

## Core Components

### Application Layer

```
┌─────────────────────────────────────────┐
│           App.tsx (Root)                │
│  - Theme Provider                       │
│  - Context Provider                     │
│  - Navigation Container                 │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Navigation Layer                │
│  - Stack Navigator                      │
│  - Tab Navigator                        │
│  - Screen Routing                       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Screen Components              │
│  - Home                                 │
│  - Playlist Detail                      │
│  - Settings                             │
│  - Player                               │
└─────────────────────────────────────────┘
```

### State Management Flow

```
┌──────────────────────────────────────────┐
│         AppContext (Provider)            │
│                                          │
│  State:                                  │
│  - playlists: Playlist[]                 │
│  - tracks: Track[]                       │
│  - settings: AppSettings                 │
│  - auth: AuthState                       │
│  - downloadQueue: DownloadQueueItem[]    │
│                                          │
│  Actions:                                │
│  - ADD_PLAYLIST                          │
│  - UPDATE_TRACK                          │
│  - SET_SETTINGS                          │
│  - SET_AUTH                              │
└──────────────────────────────────────────┘
           │                    │
           ▼                    ▼
    ┌────────────┐      ┌──────────────┐
    │  Reducer   │      │  Persistence │
    │  Logic     │      │  Layer       │
    └────────────┘      └──────────────┘
```

### Service Architecture

```
┌─────────────────────────────────────────┐
│            Services Layer               │
│                                         │
│  ┌────────────────────────────────┐    │
│  │   YouTubeApiService            │    │
│  │  - getPlaylistInfo()           │    │
│  │  - getPlaylistVideos()         │    │
│  │  - getVideoDetails()           │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │   DownloadService              │    │
│  │  - downloadTrack()             │    │
│  │  - cancelDownload()            │    │
│  │  - createM3UPlaylist()         │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │   AuthService                  │    │
│  │  - signInWithGoogle()          │    │
│  │  - refreshAccessToken()        │    │
│  │  - signOut()                   │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Data Flow

### Adding a Playlist

```
User Input (URL)
      │
      ▼
AddPlaylistScreen
      │
      ▼
usePlaylistManager hook
      │
      ▼
YouTubeApiService.getPlaylistInfo()
      │
      ▼
YouTubeApiService.getPlaylistVideos()
      │
      ▼
dispatch(ADD_PLAYLIST)
dispatch(ADD_TRACKS)
      │
      ▼
AppContext State Updated
      │
      ▼
Persist to AsyncStorage
      │
      ▼
UI Updated (Home Screen)
```

### Downloading Tracks

```
User Action (Download)
      │
      ▼
useDownloadManager hook
      │
      ▼
Add to Download Queue
      │
      ▼
DownloadService.downloadTrack()
      │
      ├─────────────────────────┐
      │                         │
      ▼                         ▼
Progress Updates          File System Write
      │                         │
      ▼                         ▼
dispatch(UPDATE_TRACK)    Storage Management
      │                         │
      └─────────────────────────┘
                  │
                  ▼
        Download Complete
                  │
                  ▼
     Create M3U Playlist
```

### Sync Flow

```
User/Background Trigger
      │
      ▼
SyncService.syncPlaylist()
      │
      ▼
Fetch Latest Playlist Data
      │
      ▼
Compare with Local Data
      │
      ├──────────────┬──────────────┐
      │              │              │
      ▼              ▼              ▼
Add New Tracks  Remove Old  No Changes
      │              │              │
      └──────────────┴──────────────┘
                  │
                  ▼
          Update State
                  │
                  ▼
      Queue Downloads (if needed)
```

## Storage Architecture

### Data Persistence

```
┌─────────────────────────────────────────┐
│         Storage Layer                   │
│                                         │
│  AsyncStorage (Unencrypted):           │
│  - Playlists                            │
│  - Tracks                               │
│  - Settings                             │
│  - App State                            │
│                                         │
│  SecureStore (Encrypted):               │
│  - Access Token                         │
│  - Refresh Token                        │
│  - User Email                           │
│  - Auth Mode                            │
│                                         │
│  File System:                           │
│  - Downloaded MP3 Files                 │
│  - M3U Playlists                        │
│  - Thumbnails (cached)                  │
└─────────────────────────────────────────┘
```

### File Organization

```
{documentDirectory}/YTMusicManager/
├── Playlist Name 1/
│   ├── Artist - Title 1.mp3
│   ├── Artist - Title 2.mp3
│   └── Playlist Name 1.m3u
├── Playlist Name 2/
│   ├── Artist - Title 3.mp3
│   ├── Artist - Title 4.mp3
│   └── Playlist Name 2.m3u
└── ...
```

## Navigation Structure

```
NavigationContainer
└── Stack Navigator (Root)
    ├── MainTabs
    │   ├── Home Tab
    │   └── Settings Tab
    ├── AddPlaylist (Modal)
    ├── PlaylistDetail (Push)
    ├── Player (Modal)
    └── SyncPreview (Modal)
```

## Component Hierarchy

### Home Screen

```
HomeScreen
├── SafeAreaView
├── Header
│   ├── Title
│   └── FilterMenu
├── Searchbar
├── FlatList
│   └── PlaylistCard (repeated)
│       ├── Thumbnail
│       ├── Details
│       │   ├── Title
│       │   ├── Track Count
│       │   └── Sync Status
│       └── Actions
│           ├── Sync Button
│           └── Delete Button
└── FAB (Add Playlist)
```

### Playlist Detail Screen

```
PlaylistDetailScreen
├── SafeAreaView
├── Header
│   ├── Playlist Info
│   ├── Stats
│   └── Actions Row
├── Searchbar
└── FlatList
    └── TrackItem (repeated)
        ├── Thumbnail
        ├── Track Info
        └── Download Button
```

## Custom Hooks

### usePlaylistManager

**Purpose**: Manage playlist operations

**Responsibilities**:
- Add playlists
- Remove playlists
- Sync playlists
- Validate playlist URLs

**Usage**:
```typescript
const { addPlaylist, removePlaylist, syncPlaylist, loading, error } = usePlaylistManager();
```

### useDownloadManager

**Purpose**: Handle download operations

**Responsibilities**:
- Download individual tracks
- Download entire playlists
- Manage concurrent downloads
- Track download progress
- Handle cancellations

**Usage**:
```typescript
const { downloadTrack, downloadPlaylist, cancelDownload, activeDownloads } = useDownloadManager();
```

## Error Handling Strategy

### Levels of Error Handling

1. **Service Level**
   - Try-catch blocks
   - API error responses
   - Network failures
   - Retry logic

2. **Hook Level**
   - State-based error tracking
   - Error propagation
   - User-friendly messages

3. **UI Level**
   - Error components
   - Alert dialogs
   - Toast notifications
   - Graceful degradation

### Error Recovery

```
Error Occurs
      │
      ▼
Log Error (Console)
      │
      ▼
Check if Recoverable
      │
      ├─────────────┬─────────────┐
      │             │             │
      ▼             ▼             ▼
Auto Retry     User Action    Show Error
(3 attempts)   Required       Message
```

## Performance Optimizations

### 1. Lazy Loading
- Screens loaded on demand
- Large lists virtualized
- Images loaded progressively

### 2. Memoization
- React.memo for components
- useMemo for expensive calculations
- useCallback for event handlers

### 3. Concurrent Operations
- Configurable download concurrency
- Background task management
- Queue-based processing

### 4. Caching
- API response caching
- Image caching
- State persistence

## Security Considerations

### 1. Authentication
- OAuth 2.0 flow
- Secure token storage
- Token refresh mechanism
- Session management

### 2. Data Protection
- Encrypted sensitive data
- No credentials in code
- Secure API communication
- Input sanitization

### 3. Permissions
- Minimal permission requests
- Runtime permission handling
- Clear permission rationale
- Graceful permission denial

## Testing Strategy

### Unit Tests
- Utility functions
- Service methods
- State reducers
- Custom hooks

### Component Tests
- Rendering
- User interactions
- Props validation
- State changes

### Integration Tests
- API integration
- Navigation flows
- Data persistence
- Background tasks

## Scalability Considerations

### 1. State Management
- Current: Context API (suitable for small-medium apps)
- Future: Redux Toolkit (if state complexity grows)

### 2. Data Storage
- Current: AsyncStorage (suitable for moderate data)
- Future: SQLite/Realm (for large datasets)

### 3. API Layer
- Current: Direct API calls
- Future: GraphQL/caching layer

### 4. Media Handling
- Current: Local storage
- Future: Cloud storage integration

## Build & Deployment

### Development Build
```
npm start → Expo Go App → Quick Testing
```

### Preview Build
```
eas build --platform android --profile preview → APK
```

### Production Build
```
eas build --platform android/ios --profile production → Store Release
```

## Monitoring & Analytics

### Recommended Integrations
- **Crash Reporting**: Sentry
- **Analytics**: Firebase Analytics
- **Performance**: React Native Performance
- **Error Tracking**: Bugsnag

### Key Metrics
- App crashes
- Download success rate
- Sync performance
- User engagement
- Storage usage

## Future Architecture Improvements

1. **Microservices Backend**
   - Separate download service
   - Authentication service
   - API gateway

2. **Offline-First Architecture**
   - Better offline support
   - Conflict resolution
   - Background sync queues

3. **Enhanced State Management**
   - Redux Toolkit migration
   - Normalized state
   - Better type safety

4. **Progressive Web App**
   - Web version support
   - Cross-platform sync
   - Cloud storage

---

**Last Updated**: 2026-01-02  
**Version**: 1.0.0
