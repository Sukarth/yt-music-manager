export const DEFAULT_SETTINGS = {
  downloadPath: '',
  audioQuality: 192 as const,
  autoSyncInterval: 6 as const,
  maxConcurrentDownloads: 3,
  autoSyncEnabled: true,
  storageCleanupEnabled: false,
  theme: 'auto' as const,
};

export const STORAGE_KEYS = {
  PLAYLISTS: '@yt_music_manager_playlists',
  TRACKS: '@yt_music_manager_tracks',
  SETTINGS: '@yt_music_manager_settings',
  AUTH: '@yt_music_manager_auth',
  LAST_SYNC: '@yt_music_manager_last_sync',
};

export const SYNC_TASK_NAME = 'YT_MUSIC_SYNC_TASK';

export const AUDIO_QUALITY_OPTIONS = [
  { label: '128 kbps', value: 128 },
  { label: '192 kbps (Recommended)', value: 192 },
  { label: '256 kbps', value: 256 },
  { label: '320 kbps', value: 320 },
];

export const AUTO_SYNC_INTERVAL_OPTIONS = [
  { label: '1 hour', value: 1 },
  { label: '3 hours', value: 3 },
  { label: '6 hours (Recommended)', value: 6 },
  { label: '12 hours', value: 12 },
  { label: '24 hours', value: 24 },
];

export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 2000;

export const YOUTUBE_PLAYLIST_REGEX =
  /(?:youtube\.com\/(?:playlist\?list=|watch\?v=.*&list=)|youtu\.be\/.*\?list=)([a-zA-Z0-9_-]+)/;

export const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
