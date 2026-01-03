import axios from 'axios';

const BACKEND_URL = 'https://yt-music-manager-backend.onrender.com';

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

  setApiKey(_key: string) {
    // No longer needed - backend handles API key
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeBackendRequest(endpoint: string, params: Record<string, any>) {
    const headers: Record<string, string> = {};

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const queryParams = new URLSearchParams(params).toString();
    const response = await axios.get(`${BACKEND_URL}${endpoint}?${queryParams}`, {
      headers,
    });

    return response.data;
  }

  async getPlaylistInfo(playlistId: string): Promise<YouTubePlaylistInfo> {
    try {
      const data = await this.makeBackendRequest('/api/youtube/playlist', {
        id: playlistId,
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
      const data = await this.makeBackendRequest('/api/youtube/playlist/videos', {
        playlistId,
      });

      return data.videos.map((video: any) => ({
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

  async getVideoDetails(videoId: string): Promise<YouTubeVideoInfo | null> {
    try {
      const data = await this.makeBackendRequest('/api/youtube/video', {
        id: videoId,
      });

      return {
        id: videoId,
        title: data.title,
        artist: data.artist,
        duration: data.duration,
        thumbnailUrl: data.thumbnailUrl || '',
      };
    } catch (error) {
      console.error('Error fetching video details:', error);
      return null;
    }
  }
}

export const youtubeApi = new YouTubeApiService();
