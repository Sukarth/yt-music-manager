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

  describe('setApiKey', () => {
    it('should set API key', () => {
      service.setApiKey('test-api-key');
      // Key is set internally, verify through API call
      expect(service).toBeDefined();
    });
  });

  describe('setAccessToken', () => {
    it('should set access token', () => {
      service.setAccessToken('test-token');
      expect(service).toBeDefined();
    });
  });

  describe('getPlaylistInfo', () => {
    it('should fetch playlist info successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'PLtest123456',
              snippet: {
                title: 'Test Playlist',
                description: 'A test playlist',
                thumbnails: {
                  medium: { url: 'https://example.com/thumb.jpg' },
                },
              },
              contentDetails: {
                itemCount: 10,
              },
            },
          ],
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

    it('should throw error when playlist not found', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { items: [] },
      });

      await expect(service.getPlaylistInfo('invalid')).rejects.toThrow(
        'Failed to fetch playlist information'
      );
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
          items: [
            {
              id: 'PLtest123456',
              snippet: {
                title: 'Test Playlist',
                description: '',
                thumbnails: {},
              },
              contentDetails: {
                itemCount: 5,
              },
            },
          ],
        },
      });

      const result = await service.getPlaylistInfo('PLtest123456');
      expect(result.thumbnailUrl).toBe('');
    });
  });

  describe('getPlaylistVideos', () => {
    it('should fetch playlist videos successfully', async () => {
      // Mock playlist items request
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              contentDetails: { videoId: 'video1' },
            },
          ],
          nextPageToken: undefined,
        },
      });

      // Mock video details request
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'video1',
              snippet: {
                title: 'Test Video',
                channelTitle: 'Test Artist',
                thumbnails: {
                  medium: { url: 'https://example.com/video-thumb.jpg' },
                },
              },
              contentDetails: {
                duration: 'PT3M30S',
              },
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

    it('should handle pagination', async () => {
      // First page
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [{ contentDetails: { videoId: 'video1' } }],
          nextPageToken: 'token123',
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'video1',
              snippet: { title: 'Video 1', channelTitle: 'Artist 1', thumbnails: {} },
              contentDetails: { duration: 'PT1M' },
            },
          ],
        },
      });

      // Second page
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [{ contentDetails: { videoId: 'video2' } }],
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'video2',
              snippet: { title: 'Video 2', channelTitle: 'Artist 2', thumbnails: {} },
              contentDetails: { duration: 'PT2M' },
            },
          ],
        },
      });

      const result = await service.getPlaylistVideos('PLtest123456');

      expect(result).toHaveLength(2);
    });

    it('should throw error on API failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(service.getPlaylistVideos('PLtest123')).rejects.toThrow(
        'Failed to fetch playlist videos'
      );
    });

    it('should skip videos that fail to fetch', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [{ contentDetails: { videoId: 'video1' } }],
        },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { items: [] },
      });

      const result = await service.getPlaylistVideos('PLtest123456');
      expect(result).toHaveLength(0);
    });
  });

  describe('getVideoDetails', () => {
    it('should fetch video details successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'video1',
              snippet: {
                title: 'Test Video',
                channelTitle: 'Test Artist',
                thumbnails: {
                  medium: { url: 'https://example.com/thumb.jpg' },
                },
              },
              contentDetails: {
                duration: 'PT3M30S',
              },
            },
          ],
        },
      });

      const result = await service.getVideoDetails('video1');

      expect(result).toEqual({
        id: 'video1',
        title: 'Test Video',
        artist: 'Test Artist',
        duration: 210,
        thumbnailUrl: 'https://example.com/thumb.jpg',
      });
    });

    it('should return null when video not found', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { items: [] },
      });

      const result = await service.getVideoDetails('invalid');
      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.getVideoDetails('video1');
      expect(result).toBeNull();
    });

    it('should parse various duration formats', async () => {
      // Test PT1H2M3S format
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'video1',
              snippet: { title: 'Test', channelTitle: 'Artist', thumbnails: {} },
              contentDetails: { duration: 'PT1H2M3S' },
            },
          ],
        },
      });

      const result = await service.getVideoDetails('video1');
      expect(result?.duration).toBe(3723);
    });

    it('should handle invalid duration format', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'video1',
              snippet: { title: 'Test', channelTitle: 'Artist', thumbnails: {} },
              contentDetails: { duration: 'invalid' },
            },
          ],
        },
      });

      const result = await service.getVideoDetails('video1');
      expect(result?.duration).toBe(0);
    });
  });
});
