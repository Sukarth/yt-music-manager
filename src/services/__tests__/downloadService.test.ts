import * as FileSystem from 'expo-file-system';
import { DownloadService } from '../downloadService';
import { Track, Playlist } from '../../types';

jest.mock('expo-file-system');

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockedFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

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

    // Mock successful fetch for getDownloadUrl
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ downloadUrl: 'https://example.com/audio.mp3' }),
    });
  });

  describe('downloadTrack', () => {
    it('should download track successfully', async () => {
      const mockDownloadAsync = jest.fn().mockResolvedValue({ uri: 'file:///test.mp3' });
      const mockPauseAsync = jest.fn();
      const mockResumeAsync = jest.fn();

      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: mockDownloadAsync,
        pauseAsync: mockPauseAsync,
        resumeAsync: mockResumeAsync,
      });

      const result = await service.downloadTrack(mockTrack, mockPlaylist, 192);

      expect(mockedFileSystem.makeDirectoryAsync).toHaveBeenCalled();
      expect(mockedFileSystem.createDownloadResumable).toHaveBeenCalled();
      expect(result).toBe('file:///test.mp3');
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
              return { uri: 'file:///test.mp3' };
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

    it('should throw error when download fails', async () => {
      (mockedFileSystem.createDownloadResumable as jest.Mock).mockReturnValue({
        downloadAsync: jest.fn().mockResolvedValue(null),
        pauseAsync: jest.fn(),
        resumeAsync: jest.fn(),
      });

      await expect(service.downloadTrack(mockTrack, mockPlaylist, 192)).rejects.toThrow(
        'Download failed'
      );
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
    it('should delete existing file', async () => {
      (mockedFileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });

      await service.deleteTrackFile('file:///test.mp3');

      expect(mockedFileSystem.deleteAsync).toHaveBeenCalledWith('file:///test.mp3');
    });

    it('should not delete non-existent file', async () => {
      (mockedFileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });

      await service.deleteTrackFile('file:///nonexistent.mp3');

      expect(mockedFileSystem.deleteAsync).not.toHaveBeenCalled();
    });

    it('should throw error on delete failure', async () => {
      (mockedFileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });
      (mockedFileSystem.deleteAsync as jest.Mock).mockRejectedValueOnce(new Error('Delete failed'));

      await expect(service.deleteTrackFile('file:///test.mp3')).rejects.toThrow('Delete failed');
    });
  });

  describe('getDirectorySize', () => {
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
  });
});
