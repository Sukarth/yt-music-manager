export interface Playlist {
  id: string;
  name: string;
  url: string;
  trackCount: number;
  totalSize: number;
  lastSynced: string | null;
  dateAdded: string;
  syncStatus: 'idle' | 'syncing' | 'downloading' | 'completed' | 'error';
  thumbnailUrl?: string;
  description?: string;
}

export interface Track {
  id: string;
  playlistId: string;
  title: string;
  artist: string;
  duration: number;
  fileSize: number;
  filePath: string | null;
  downloadStatus: 'pending' | 'downloading' | 'completed' | 'error';
  downloadProgress: number;
  thumbnailUrl?: string;
  youtubeId: string;
  position: number;
}

export interface DownloadQueueItem {
  track: Track;
  playlist: Playlist;
  priority: number;
}

export interface AppSettings {
  downloadPath: string;
  audioQuality: 128 | 192 | 256 | 320;
  autoSyncInterval: 1 | 3 | 6 | 12 | 24;
  maxConcurrentDownloads: number;
  autoSyncEnabled: boolean;
  storageCleanupEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  youtubeApiKey: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: string | null;
  userEmail: string | null;
  authMode: 'oauth' | 'none';
}

export interface SyncPreview {
  tracksToAdd: Track[];
  tracksToRemove: Track[];
  totalDownloadSize: number;
}

export interface StorageInfo {
  totalSpace: number;
  freeSpace: number;
  usedByApp: number;
}

export interface AppState {
  playlists: Playlist[];
  tracks: Track[];
  downloadQueue: DownloadQueueItem[];
  settings: AppSettings;
  auth: AuthState;
  currentPlayingTrack: Track | null;
  storageInfo: StorageInfo | null;
}

export type RootStackParamList = {
  MainTabs: undefined;
  AddPlaylist: undefined;
  PlaylistDetail: { playlistId: string };
  Player: { trackId: string };
  SyncPreview: { playlistId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Settings: undefined;
};
