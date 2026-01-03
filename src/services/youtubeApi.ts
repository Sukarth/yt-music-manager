import axios from 'axios';
import { BACKEND_URL } from '../constants';

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
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeBackendRequest(
    endpoint: string,
    params: Record<string, string>
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {};

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const queryParams = new URLSearchParams(params).toString();
    const response = await axios.get(`${BACKEND_URL}/api${endpoint}?${queryParams}`, {
      headers,
    });

    return response.data;
  }

  async getPlaylistInfo(playlistId: string): Promise<YouTubePlaylistInfo> {
    try {
      const data = await this.makeBackendRequest('/playlist-info', {
        playlistId,
      });

      return {
        id: data.id as string,
        title: data.title as string,
        description: (data.description as string) || '',
        thumbnailUrl: (data.thumbnailUrl as string) || '',
        itemCount: data.itemCount as number,
      };
    } catch (error) {
      console.error('Error fetching playlist info:', error);
      throw new Error('Failed to fetch playlist information');
    }
  }

  async getPlaylistVideos(playlistId: string): Promise<YouTubeVideoInfo[]> {
    try {
      const data = await this.makeBackendRequest('/playlist-videos', {
        playlistId,
      });

      const videos = data.videos as Array<{
        id: string;
        title: string;
        artist: string;
        duration: number;
        thumbnailUrl?: string;
      }>;

      return videos.map(video => ({
        id: video.id,
        title: video.title,
        artist: video.artist,
        duration: video.duration,
        thumbnailUrl: video.thumbnailUrl || '',
      }));
    } catch (error) {
      console.error('Error fetching playlist videos:', error);
      throw new Error('Failed to fetch playlist videos');
    }
  }
}

export const youtubeApi = new YouTubeApiService();
