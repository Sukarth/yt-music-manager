import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  SYNC_TASK_NAME,
  AUDIO_QUALITY_OPTIONS,
  AUTO_SYNC_INTERVAL_OPTIONS,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
  YOUTUBE_PLAYLIST_REGEX,
  YOUTUBE_API_BASE_URL,
  BACKEND_URL,
} from '../index';

describe('constants', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('should have default audio quality of 192', () => {
      expect(DEFAULT_SETTINGS.audioQuality).toBe(192);
    });

    it('should have default auto sync interval of 6', () => {
      expect(DEFAULT_SETTINGS.autoSyncInterval).toBe(6);
    });

    it('should have default max concurrent downloads of 3', () => {
      expect(DEFAULT_SETTINGS.maxConcurrentDownloads).toBe(3);
    });

    it('should have auto sync enabled by default', () => {
      expect(DEFAULT_SETTINGS.autoSyncEnabled).toBe(true);
    });

    it('should have storage cleanup disabled by default', () => {
      expect(DEFAULT_SETTINGS.storageCleanupEnabled).toBe(false);
    });

    it('should have theme set to auto by default', () => {
      expect(DEFAULT_SETTINGS.theme).toBe('auto');
    });

    it('should have empty download path', () => {
      expect(DEFAULT_SETTINGS.downloadPath).toBe('');
    });
  });

  describe('STORAGE_KEYS', () => {
    it('should have playlists key', () => {
      expect(STORAGE_KEYS.PLAYLISTS).toBe('@yt_music_manager_playlists');
    });

    it('should have tracks key', () => {
      expect(STORAGE_KEYS.TRACKS).toBe('@yt_music_manager_tracks');
    });

    it('should have settings key', () => {
      expect(STORAGE_KEYS.SETTINGS).toBe('@yt_music_manager_settings');
    });

    it('should have auth key', () => {
      expect(STORAGE_KEYS.AUTH).toBe('@yt_music_manager_auth');
    });

    it('should have last sync key', () => {
      expect(STORAGE_KEYS.LAST_SYNC).toBe('@yt_music_manager_last_sync');
    });
  });

  describe('SYNC_TASK_NAME', () => {
    it('should be defined', () => {
      expect(SYNC_TASK_NAME).toBe('YT_MUSIC_SYNC_TASK');
    });
  });

  describe('AUDIO_QUALITY_OPTIONS', () => {
    it('should have 4 options', () => {
      expect(AUDIO_QUALITY_OPTIONS).toHaveLength(4);
    });

    it('should have 128 kbps option', () => {
      expect(AUDIO_QUALITY_OPTIONS.find(o => o.value === 128)).toBeTruthy();
    });

    it('should have 192 kbps option as recommended', () => {
      const option = AUDIO_QUALITY_OPTIONS.find(o => o.value === 192);
      expect(option?.label).toContain('Recommended');
    });

    it('should have 256 and 320 kbps options', () => {
      expect(AUDIO_QUALITY_OPTIONS.find(o => o.value === 256)).toBeTruthy();
      expect(AUDIO_QUALITY_OPTIONS.find(o => o.value === 320)).toBeTruthy();
    });
  });

  describe('AUTO_SYNC_INTERVAL_OPTIONS', () => {
    it('should have 5 options', () => {
      expect(AUTO_SYNC_INTERVAL_OPTIONS).toHaveLength(5);
    });

    it('should have 1, 3, 6, 12, 24 hour options', () => {
      const values = AUTO_SYNC_INTERVAL_OPTIONS.map(o => o.value);
      expect(values).toEqual([1, 3, 6, 12, 24]);
    });

    it('should have 6 hours as recommended', () => {
      const option = AUTO_SYNC_INTERVAL_OPTIONS.find(o => o.value === 6);
      expect(option?.label).toContain('Recommended');
    });
  });

  describe('retry constants', () => {
    it('should have max retry attempts of 3', () => {
      expect(MAX_RETRY_ATTEMPTS).toBe(3);
    });

    it('should have retry delay of 2000ms', () => {
      expect(RETRY_DELAY_MS).toBe(2000);
    });
  });

  describe('YOUTUBE_PLAYLIST_REGEX', () => {
    it('should match full playlist URL', () => {
      const url = 'https://youtube.com/playlist?list=PLtest123456';
      const match = url.match(YOUTUBE_PLAYLIST_REGEX);
      expect(match).toBeTruthy();
      expect(match?.[1]).toBe('PLtest123456');
    });

    it('should match watch URL with playlist', () => {
      const url = 'https://youtube.com/watch?v=abc&list=PLtest123456';
      const match = url.match(YOUTUBE_PLAYLIST_REGEX);
      expect(match).toBeTruthy();
    });

    it('should match youtu.be URL with playlist', () => {
      const url = 'https://youtu.be/abc?list=PLtest123456';
      const match = url.match(YOUTUBE_PLAYLIST_REGEX);
      expect(match).toBeTruthy();
    });
  });

  describe('YOUTUBE_API_BASE_URL', () => {
    it('should be correct', () => {
      expect(YOUTUBE_API_BASE_URL).toBe('https://www.googleapis.com/youtube/v3');
    });
  });

  describe('BACKEND_URL', () => {
    it('should be correct', () => {
      expect(BACKEND_URL).toBe('https://yt-music-manager-backend.onrender.com');
    });
  });
});
