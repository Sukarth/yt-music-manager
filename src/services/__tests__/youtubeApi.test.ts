import axios from 'axios';
import { YouTubeApiService } from '../youtubeApi';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('YouTubeApiService', () => {
  let service: YouTubeApiService;

  beforeEach(() => {
    service = new YouTubeApiService();
    jest.clearAllMocks();
  });

  describe('setAccessToken', () => {
    it('should set access token', () => {
      service.setAccessToken('test-token');
      expect(service).toBeDefined();
    });
  });

  describe('getPlaylistInfo', () => {
    it('should fetch playlist info successfully from backend', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'PLtest123456',
          title: 'Test Playlist',
          description: 'A test playlist',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          itemCount: 10,
        },
      });

      const result = await service.getPlaylistInfo('PLtest123456');

      expect(result).toEqual({
        id: 'PLtest123456',
        title: 'Test Playlist',
        description: 'A test playlist',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        itemCount: 10,
      });
    });

    it('should throw error on API failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.getPlaylistInfo('PLtest123')).rejects.toThrow(
        'Failed to fetch playlist information'
      );
    });

    it('should handle missing thumbnails', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'PLtest123456',
          title: 'Test Playlist',
          description: '',
          thumbnailUrl: null,
          itemCount: 5,
        },
      });

      const result = await service.getPlaylistInfo('PLtest123456');
      expect(result.thumbnailUrl).toBe('');
    });
  });

  describe('getPlaylistVideos', () => {
    it('should fetch playlist videos successfully from backend', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          playlistId: 'PLtest123456',
          title: 'Test Playlist',
          itemCount: 1,
          videos: [
            {
              id: 'video1',
              title: 'Test Video',
              author: 'Test Artist',
              duration: 210,
              thumbnailUrl: 'https://example.com/video-thumb.jpg',
            },
          ],
        },
      });

      const result = await service.getPlaylistVideos('PLtest123456');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'video1',
        title: 'Test Video',
        artist: 'Test Artist',
        duration: 210,
        thumbnailUrl: 'https://example.com/video-thumb.jpg',
      });
    });

    it('should throw error on API failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.getPlaylistVideos('PLtest123')).rejects.toThrow(
        'Failed to fetch playlist videos'
      );
    });

    it('should handle multiple videos', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          playlistId: 'PLtest123456',
          title: 'Test Playlist',
          itemCount: 2,
          videos: [
            {
              id: 'video1',
              title: 'Video 1',
              author: 'Artist 1',
              duration: 180,
              thumbnailUrl: 'https://example.com/thumb1.jpg',
            },
            {
              id: 'video2',
              title: 'Video 2',
              author: 'Artist 2',
              duration: 240,
              thumbnailUrl: null,
            },
          ],
        },
      });

      const result = await service.getPlaylistVideos('PLtest123456');

      expect(result).toHaveLength(2);
      expect(result[0].artist).toBe('Artist 1');
      expect(result[1].thumbnailUrl).toBe('');
    });

    it('should include authorization header when access token is set', async () => {
      service.setAccessToken('test-token');

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          playlistId: 'PLtest123456',
          title: 'Test Playlist',
          itemCount: 0,
          videos: [],
        },
      });

      await service.getPlaylistVideos('PLtest123456');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/playlist-videos'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });
});
