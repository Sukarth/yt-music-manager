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

// Backend API response types
interface PlaylistInfoResponse {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  itemCount: number;
}

interface VideoInfoResponse {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnailUrl?: string;
}

interface PlaylistVideosResponse {
  videos: VideoInfoResponse[];
}

export class YouTubeApiService {
  private accessToken: string | null = null;

  /**
   * Sets the OAuth access token for authenticated requests.
   * The token is passed to the backend for private playlist access.
   */
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeBackendRequest<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const queryParams = new URLSearchParams(params).toString();
    const response = await axios.get<T>(`${BACKEND_URL}/api${endpoint}?${queryParams}`, {
      headers,
    });

    return response.data;
  }

  async getPlaylistInfo(playlistId: string): Promise<YouTubePlaylistInfo> {
    try {
      const data = await this.makeBackendRequest<PlaylistInfoResponse>('/playlist-info', {
        playlistId,
      });

      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        thumbnailUrl: data.thumbnailUrl || '',
        itemCount: data.itemCount,
      };
    } catch (error) {
      console.error('Error fetching playlist info:', error);
      throw new Error('Failed to fetch playlist information');
    }
  }

  async getPlaylistVideos(playlistId: string): Promise<YouTubeVideoInfo[]> {
    try {
      const data = await this.makeBackendRequest<PlaylistVideosResponse>('/playlist-videos', {
        playlistId,
      });

      return data.videos.map(video => ({
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
