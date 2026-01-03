import axios from 'axios';
import { YOUTUBE_API_BASE_URL } from '../constants';

// Default API key for the app - allows basic functionality without user setup
const DEFAULT_API_KEY = 'AIzaSyC8UYZpvA2eknNex0Pjid0_eTLJoDu6los';

export interface YouTubePlaylistInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  itemCount: number;
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnailUrl: string;
}

export class YouTubeApiService {
  private apiKey: string = DEFAULT_API_KEY;
  private accessToken: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key || DEFAULT_API_KEY;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeRequest(endpoint: string, params: Record<string, any>) {
    const headers: Record<string, string> = {};

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await axios.get(`${YOUTUBE_API_BASE_URL}${endpoint}`, {
      params: {
        ...params,
        key: this.apiKey,
      },
      headers,
    });

    return response.data;
  }

  async getPlaylistInfo(playlistId: string): Promise<YouTubePlaylistInfo> {
    try {
      const data = await this.makeRequest('/playlists', {
        part: 'snippet,contentDetails',
        id: playlistId,
      });

      if (!data.items || data.items.length === 0) {
        throw new Error('Playlist not found');
      }

      const playlist = data.items[0];
      return {
        id: playlist.id,
        title: playlist.snippet.title,
        description: playlist.snippet.description || '',
        thumbnailUrl: playlist.snippet.thumbnails?.medium?.url || '',
        itemCount: playlist.contentDetails.itemCount,
      };
    } catch (error) {
      console.error('Error fetching playlist info:', error);
      throw new Error('Failed to fetch playlist information');
    }
  }

  async getPlaylistVideos(playlistId: string): Promise<YouTubeVideoInfo[]> {
    try {
      const videos: YouTubeVideoInfo[] = [];
      let nextPageToken: string | undefined;

      do {
        const data = await this.makeRequest('/playlistItems', {
          part: 'snippet,contentDetails',
          playlistId,
          maxResults: 50,
          pageToken: nextPageToken,
        });

        if (data.items) {
          for (const item of data.items) {
            const videoId = item.contentDetails.videoId;
            const videoDetails = await this.getVideoDetails(videoId);
            if (videoDetails) {
              videos.push(videoDetails);
            }
          }
        }

        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      return videos;
    } catch (error) {
      console.error('Error fetching playlist videos:', error);
      throw new Error('Failed to fetch playlist videos');
    }
  }

  async getVideoDetails(videoId: string): Promise<YouTubeVideoInfo | null> {
    try {
      const data = await this.makeRequest('/videos', {
        part: 'snippet,contentDetails',
        id: videoId,
      });

      if (!data.items || data.items.length === 0) {
        return null;
      }

      const video = data.items[0];
      const duration = this.parseDuration(video.contentDetails.duration);

      return {
        id: videoId,
        title: video.snippet.title,
        artist: video.snippet.channelTitle,
        duration,
        thumbnailUrl: video.snippet.thumbnails?.medium?.url || '',
      };
    } catch (error) {
      console.error('Error fetching video details:', error);
      return null;
    }
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }
}

export const youtubeApi = new YouTubeApiService();
