import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DownloadService } from '../downloadService';
import { Track, Playlist } from '../../types';
import { addToDownloadIndex, removeFromDownloadIndex } from '../../utils/downloadIndex';

jest.mock('../../utils/downloadIndex', () => ({
  addToDownloadIndex: jest.fn(),
  removeFromDownloadIndex: jest.fn(),
}));

const mockedFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedAddToDownloadIndex = addToDownloadIndex as jest.Mock;
const mockedRemoveFromDownloadIndex = removeFromDownloadIndex as jest.Mock;

describe('DownloadService', () => {
  let service: DownloadService;

  const mockTrack: Track = {
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
  };

  const mockPlaylist: Playlist = {
    id: 'playlist-1',
    name: 'Test Playlist',
    url: 'https://youtube.com/playlist?list=PLtest',
    trackCount: 10,
    totalSize: 0,
    lastSynced: null,
    dateAdded: new Date().toISOString(),
    syncStatus: 'idle',
  };

  beforeEach(() => {
    service = new DownloadService();
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    (mockedFileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe('downloadTrack', () => {
    it('should download track successfully', async () => {
      const mockDownloadAsync = jest
        .fn()
        .mockResolvedValue({ uri: 'file:///test.mp3', status: 200 });
      const mockPauseAsync = jest.fn();
      const mockResumeAsync = jest.fn();

      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: mockDownloadAsync,
        pauseAsync: mockPauseAsync,
        resumeAsync: mockResumeAsync,
      });
      (mockedFileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: true,
        isDirectory: false,
        size: 123,
      });

      const result = await service.downloadTrack(mockTrack, mockPlaylist, 192);

      expect(mockedFileSystem.makeDirectoryAsync).toHaveBeenCalled();
      expect(mockedFileSystem.createDownloadResumable).toHaveBeenCalled();
      expect(result).toBe('file:///test.mp3');
      expect(mockedAddToDownloadIndex).toHaveBeenCalledWith('file:///test.mp3', 123);
    });

    it('should call progress callback during download', async () => {
      let progressCallback: any;

      (mockedFileSystem.createDownloadResumable as jest.Mock).mockImplementation(
        (_url, _path, _options, callback) => {
          progressCallback = callback;
          return {
            downloadAsync: jest.fn().mockImplementation(async () => {
              // Simulate progress
              if (progressCallback) {
                progressCallback({ totalBytesWritten: 500, totalBytesExpectedToWrite: 1000 });
              }
              return { uri: 'file:///test.mp3', status: 200 };
            }),
            pauseAsync: jest.fn(),
            resumeAsync: jest.fn(),
          };
        }
      );

      const onProgress = jest.fn();
      await service.downloadTrack(mockTrack, mockPlaylist, 192, onProgress);

      expect(onProgress).toHaveBeenCalledWith(0.5, 500, 1000);
    });

    it('should throw error when download returns no result', async () => {
      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: jest.fn().mockResolvedValue(null),
        pauseAsync: jest.fn(),
        resumeAsync: jest.fn(),
      });

      await expect(service.downloadTrack(mockTrack, mockPlaylist, 192)).rejects.toThrow(
        'Download failed: No result returned'
      );
    });

    it('should throw error when status is not 200', async () => {
      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///test.mp3', status: 500 }),
        pauseAsync: jest.fn(),
        resumeAsync: jest.fn(),
      });

      await expect(service.downloadTrack(mockTrack, mockPlaylist, 192)).rejects.toThrow(
        'Download failed with status 500'
      );
      expect(mockedFileSystem.deleteAsync).toHaveBeenCalled();
    });

    it('should handle download error', async () => {
      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: jest.fn().mockRejectedValue(new Error('Network error')),
        pauseAsync: jest.fn(),
        resumeAsync: jest.fn(),
      });

      await expect(service.downloadTrack(mockTrack, mockPlaylist, 192)).rejects.toThrow(
        'Network error'
      );
    });

    it('should download track using SAF when custom storage is configured', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({
          storageLocationType: 'custom',
          downloadPath: 'content://root/document/YT%20Music%20Manager',
        })
      );

      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///cache.m4a', status: 200 }),
        pauseAsync: jest.fn(),
        resumeAsync: jest.fn(),
      });

      (mockedFileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: true,
        isDirectory: false,
        size: 10 * 1024,
      });

      (mockedFileSystem.StorageAccessFramework?.readDirectoryAsync as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      (
        mockedFileSystem.StorageAccessFramework?.makeDirectoryAsync as jest.Mock
      ).mockResolvedValueOnce('content://playlist-folder');

      (mockedFileSystem.StorageAccessFramework?.createFileAsync as jest.Mock).mockResolvedValueOnce(
        'content://playlist-folder/track.m4a'
      );

      const result = await service.downloadTrack(mockTrack, mockPlaylist, 192);

      expect(mockedFileSystem.readAsStringAsync).toHaveBeenCalled();
      expect(mockedFileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(mockedFileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache.m4a', {
        idempotent: true,
      });
      expect(mockedAddToDownloadIndex).toHaveBeenCalledWith(
        'content://playlist-folder/track.m4a',
        10 * 1024
      );
      expect(result).toBe('content://playlist-folder/track.m4a');
    });

    it('should reject tiny SAF downloads as invalid', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({
          storageLocationType: 'custom',
          downloadPath: 'content://root/document/YT%20Music%20Manager',
        })
      );

      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///cache.m4a', status: 200 }),
        pauseAsync: jest.fn(),
        resumeAsync: jest.fn(),
      });

      (mockedFileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: true,
        isDirectory: false,
        size: 1024,
      });

      await expect(service.downloadTrack(mockTrack, mockPlaylist, 192)).rejects.toThrow(
        'Downloaded file is too small (possible error page)'
      );
      expect(mockedFileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache.m4a', {
        idempotent: true,
      });
    });
  });

  describe('cancelDownload', () => {
    it('should cancel active download', async () => {
      const mockPauseAsync = jest.fn();

      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: jest.fn().mockImplementation(
          () =>
            new Promise(() => {
              /* never resolves */
            })
        ),
        pauseAsync: mockPauseAsync,
        resumeAsync: jest.fn(),
      });

      // Start a download without awaiting
      service.downloadTrack(mockTrack, mockPlaylist, 192);

      // Small delay to let download start
      await new Promise(resolve => setTimeout(resolve, 10));

      // Cancel it
      await service.cancelDownload(mockTrack.id);

      expect(mockPauseAsync).toHaveBeenCalled();
    });

    it('should handle cancel when no active download', async () => {
      // Should not throw
      await expect(service.cancelDownload('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('pauseDownload', () => {
    it('should pause active download', async () => {
      const mockPauseAsync = jest.fn();

      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: jest.fn().mockImplementation(
          () =>
            new Promise(() => {
              /* never resolves */
            })
        ),
        pauseAsync: mockPauseAsync,
        resumeAsync: jest.fn(),
      });

      // Start download without awaiting
      service.downloadTrack(mockTrack, mockPlaylist, 192);

      // Small delay to let download start
      await new Promise(resolve => setTimeout(resolve, 10));

      await service.pauseDownload(mockTrack.id);

      expect(mockPauseAsync).toHaveBeenCalled();
    });

    it('should handle pause when no active download', async () => {
      await expect(service.pauseDownload('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('resumeDownload', () => {
    it('should resume paused download', async () => {
      const mockResumeAsync = jest.fn();

      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: jest.fn().mockImplementation(
          () =>
            new Promise(() => {
              /* never resolves */
            })
        ),
        pauseAsync: jest.fn(),
        resumeAsync: mockResumeAsync,
      });

      // Start download without awaiting
      service.downloadTrack(mockTrack, mockPlaylist, 192);

      // Small delay to let download start
      await new Promise(resolve => setTimeout(resolve, 10));

      await service.resumeDownload(mockTrack.id);

      expect(mockResumeAsync).toHaveBeenCalled();
    });

    it('should handle resume when no active download', async () => {
      await expect(service.resumeDownload('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('deleteTrackFile', () => {
    it('should delete file and update download index', async () => {
      await service.deleteTrackFile('file:///test.mp3');

      expect(mockedFileSystem.deleteAsync).toHaveBeenCalledWith('file:///test.mp3', {
        idempotent: true,
      });
      expect(mockedRemoveFromDownloadIndex).toHaveBeenCalledWith('file:///test.mp3');
    });

    it('should use SAF delete when content uri is provided', async () => {
      await service.deleteTrackFile('content://test.mp3');

      expect(mockedFileSystem.StorageAccessFramework?.deleteAsync).toHaveBeenCalledWith(
        'content://test.mp3',
        { idempotent: true }
      );
      expect(mockedRemoveFromDownloadIndex).toHaveBeenCalledWith('content://test.mp3');
    });

    it('should not throw if deletion fails', async () => {
      (mockedFileSystem.deleteAsync as jest.Mock).mockRejectedValueOnce(new Error('Delete failed'));

      await expect(service.deleteTrackFile('file:///test.mp3')).resolves.toBeUndefined();
      expect(mockedRemoveFromDownloadIndex).toHaveBeenCalledWith('file:///test.mp3');
    });
  });

  describe('getDirectorySize', () => {
    it('should return 0 for SAF directories', async () => {
      const size = await service.getDirectorySize('content://folder');
      expect(size).toBe(0);
    });

    it('should calculate directory size', async () => {
      (mockedFileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true }) // directory check
        .mockResolvedValueOnce({ exists: true, isDirectory: false, size: 1000 })
        .mockResolvedValueOnce({ exists: true, isDirectory: false, size: 2000 });

      (mockedFileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([
        'file1.mp3',
        'file2.mp3',
      ]);

      const size = await service.getDirectorySize('file:///test/');
      expect(size).toBe(3000);
    });

    it('should return 0 for non-existent directory', async () => {
      (mockedFileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

      const size = await service.getDirectorySize('file:///nonexistent/');
      expect(size).toBe(0);
    });

    it('should return 0 on error', async () => {
      (mockedFileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('Error'));

      const size = await service.getDirectorySize('file:///test/');
      expect(size).toBe(0);
    });

    it('should skip directories when calculating size', async () => {
      (mockedFileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true })
        .mockResolvedValueOnce({ exists: true, isDirectory: true, size: 0 })
        .mockResolvedValueOnce({ exists: true, isDirectory: false, size: 1000 });

      (mockedFileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['subdir', 'file.mp3']);

      const size = await service.getDirectorySize('file:///test/');
      expect(size).toBe(1000);
    });
  });

  describe('createM3UPlaylist', () => {
    it('should create M3U playlist', async () => {
      const tracks: Track[] = [
        { ...mockTrack, downloadStatus: 'completed', filePath: 'file:///test1.mp3' },
        { ...mockTrack, id: 'track-2', downloadStatus: 'completed', filePath: 'file:///test2.mp3' },
      ];

      const result = await service.createM3UPlaylist(mockPlaylist, tracks);

      expect(mockedFileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(result).toContain('.m3u');
    });

    it('should skip non-completed tracks', async () => {
      const tracks: Track[] = [
        { ...mockTrack, downloadStatus: 'completed', filePath: 'file:///test1.mp3' },
        { ...mockTrack, id: 'track-2', downloadStatus: 'pending', filePath: null },
      ];

      await service.createM3UPlaylist(mockPlaylist, tracks);

      const writeCall = (mockedFileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
      const m3uContent = writeCall[1];

      expect(m3uContent).toContain('file:///test1.mp3');
      expect(m3uContent).not.toContain('track-2');
    });

    it('should use internal folder for M3U when no custom settings', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({
          storageLocationType: 'internal',
        })
      );

      const tracks: Track[] = [
        { ...mockTrack, downloadStatus: 'completed', filePath: 'file:///test1.mp3' },
      ];

      const result = await service.createM3UPlaylist(mockPlaylist, tracks);

      expect(result).toContain('YTMusicManager');
      expect(mockedFileSystem.writeAsStringAsync).toHaveBeenCalled();
    });

    it('should create SAF M3U file when none exists', async () => {
      mockedAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({
          storageLocationType: 'custom',
          downloadPath: 'content://root/document/YT%20Music%20Manager',
        })
      );

      (mockedFileSystem.StorageAccessFramework?.readDirectoryAsync as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      (
        mockedFileSystem.StorageAccessFramework?.makeDirectoryAsync as jest.Mock
      ).mockResolvedValueOnce('content://playlist-folder');

      const tracks: Track[] = [
        { ...mockTrack, downloadStatus: 'completed', filePath: 'file:///test1.mp3' },
      ];

      const result = await service.createM3UPlaylist(mockPlaylist, tracks);

      expect(result).toBe('content://file');
      expect(mockedFileSystem.StorageAccessFramework?.createFileAsync).toHaveBeenCalled();
      expect(mockedFileSystem.writeAsStringAsync).toHaveBeenCalled();
    });
  });
});
