import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  loadPlaylists,
  savePlaylists,
  loadTracks,
  saveTracks,
  loadSettings,
  saveSettings,
  loadAuth,
  saveAuth,
  clearAuth,
} from '../storage';
import { Playlist, Track, AppSettings, AuthState } from '../../types';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('storage utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to default behavior
    (mockedAsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (mockedAsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (mockedSecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (mockedSecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (mockedSecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe('loadPlaylists', () => {
    it('should load playlists successfully', async () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 'playlist-1',
          name: 'Test Playlist',
          url: 'https://youtube.com/playlist?list=PLtest',
          trackCount: 10,
          totalSize: 1000,
          lastSynced: null,
          dateAdded: new Date().toISOString(),
          syncStatus: 'idle',
        },
      ];

      (mockedAsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockPlaylists));

      const result = await loadPlaylists();

      expect(result).toEqual(mockPlaylists);
    });

    it('should return empty array when no playlists', async () => {
      (mockedAsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await loadPlaylists();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      (mockedAsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await loadPlaylists();

      expect(result).toEqual([]);
    });
  });

  describe('savePlaylists', () => {
    it('should save playlists successfully', async () => {
      const mockPlaylists: Playlist[] = [
        {
          id: 'playlist-1',
          name: 'Test Playlist',
          url: 'https://youtube.com/playlist?list=PLtest',
          trackCount: 10,
          totalSize: 1000,
          lastSynced: null,
          dateAdded: new Date().toISOString(),
          syncStatus: 'idle',
        },
      ];

      await savePlaylists(mockPlaylists);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        '@yt_music_manager_playlists',
        JSON.stringify(mockPlaylists)
      );
    });

    it('should throw on save error', async () => {
      (mockedAsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Save error'));

      await expect(savePlaylists([])).rejects.toThrow('Save error');
    });
  });

  describe('loadTracks', () => {
    it('should load tracks successfully', async () => {
      const mockTracks: Track[] = [
        {
          id: 'track-1',
          playlistId: 'playlist-1',
          title: 'Test Track',
          artist: 'Test Artist',
          duration: 180,
          fileSize: 0,
          filePath: null,
          downloadStatus: 'pending',
          downloadProgress: 0,
          youtubeId: 'yt123',
          position: 0,
        },
      ];

      (mockedAsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockTracks));

      const result = await loadTracks();

      expect(result).toEqual(mockTracks);
    });

    it('should return empty array when no tracks', async () => {
      (mockedAsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await loadTracks();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      (mockedAsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await loadTracks();

      expect(result).toEqual([]);
    });
  });

  describe('saveTracks', () => {
    it('should save tracks successfully', async () => {
      const mockTracks: Track[] = [
        {
          id: 'track-1',
          playlistId: 'playlist-1',
          title: 'Test Track',
          artist: 'Test Artist',
          duration: 180,
          fileSize: 0,
          filePath: null,
          downloadStatus: 'pending',
          downloadProgress: 0,
          youtubeId: 'yt123',
          position: 0,
        },
      ];

      await saveTracks(mockTracks);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        '@yt_music_manager_tracks',
        JSON.stringify(mockTracks)
      );
    });

    it('should throw on save error', async () => {
      (mockedAsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Save error'));

      await expect(saveTracks([])).rejects.toThrow('Save error');
    });
  });

  describe('loadSettings', () => {
    it('should load settings successfully', async () => {
      const mockSettings: AppSettings = {
        downloadPath: '/test/path',
        audioQuality: 192,
        autoSyncInterval: 6,
        maxConcurrentDownloads: 3,
        autoSyncEnabled: true,
        storageCleanupEnabled: false,
        theme: 'auto',
      };

      (mockedAsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      const result = await loadSettings();

      expect(result).toEqual(mockSettings);
    });

    it('should return null when no settings', async () => {
      (mockedAsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await loadSettings();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (mockedAsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await loadSettings();

      expect(result).toBeNull();
    });
  });

  describe('saveSettings', () => {
    it('should save settings successfully', async () => {
      const mockSettings: AppSettings = {
        downloadPath: '/test/path',
        audioQuality: 192,
        autoSyncInterval: 6,
        maxConcurrentDownloads: 3,
        autoSyncEnabled: true,
        storageCleanupEnabled: false,
        theme: 'auto',
      };

      await saveSettings(mockSettings);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        '@yt_music_manager_settings',
        JSON.stringify(mockSettings)
      );
    });

    it('should throw on save error', async () => {
      (mockedAsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Save error'));

      const mockSettings: AppSettings = {
        downloadPath: '/test/path',
        audioQuality: 192,
        autoSyncInterval: 6,
        maxConcurrentDownloads: 3,
        autoSyncEnabled: true,
        storageCleanupEnabled: false,
        theme: 'auto',
      };

      await expect(saveSettings(mockSettings)).rejects.toThrow('Save error');
    });
  });

  describe('loadAuth', () => {
    it('should load auth successfully', async () => {
      (mockedSecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('test-token') // access_token
        .mockResolvedValueOnce('refresh-token') // refresh_token
        .mockResolvedValueOnce('2024-12-31T00:00:00Z') // token_expiry
        .mockResolvedValueOnce('test@example.com') // user_email
        .mockResolvedValueOnce('oauth'); // auth_mode

      const result = await loadAuth();

      expect(result).toEqual({
        isAuthenticated: true,
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        tokenExpiry: '2024-12-31T00:00:00Z',
        userEmail: 'test@example.com',
        authMode: 'oauth',
      });
    });

    it('should return null when no access token', async () => {
      (mockedSecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await loadAuth();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (mockedSecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await loadAuth();

      expect(result).toBeNull();
    });
  });

  describe('saveAuth', () => {
    it('should save auth successfully', async () => {
      const mockAuth: AuthState = {
        isAuthenticated: true,
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        tokenExpiry: '2024-12-31T00:00:00Z',
        userEmail: 'test@example.com',
        authMode: 'oauth',
      };

      await saveAuth(mockAuth);

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'test-token');
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'refresh-token');
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        'token_expiry',
        '2024-12-31T00:00:00Z'
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('user_email', 'test@example.com');
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('auth_mode', 'oauth');
    });

    it('should not save null values', async () => {
      const mockAuth: AuthState = {
        isAuthenticated: true,
        accessToken: 'test-token',
        refreshToken: null,
        tokenExpiry: null,
        userEmail: null,
        authMode: 'oauth',
      };

      await saveAuth(mockAuth);

      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'test-token');
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('auth_mode', 'oauth');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String)
      );
    });

    it('should throw on save error', async () => {
      (mockedSecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(new Error('Save error'));

      const mockAuth: AuthState = {
        isAuthenticated: true,
        accessToken: 'test-token',
        refreshToken: null,
        tokenExpiry: null,
        userEmail: null,
        authMode: 'oauth',
      };

      await expect(saveAuth(mockAuth)).rejects.toThrow('Save error');
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth data', async () => {
      await clearAuth();

      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('token_expiry');
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('user_email');
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_mode');
    });

    it('should throw on clear error', async () => {
      (mockedSecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Delete error')
      );

      await expect(clearAuth()).rejects.toThrow('Delete error');
    });
  });
});
