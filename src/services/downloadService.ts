import * as FileSystem from 'expo-file-system';
import { Track, Playlist } from '../types';
import { sanitizeFileName } from '../utils/formatters';

type DownloadResumable = ReturnType<typeof FileSystem.createDownloadResumable>;

const getDocumentDirectory = (): string => {
  return (FileSystem as any).documentDirectory || 'file:///';
};

export class DownloadService {
  private activeDownloads: Map<string, DownloadResumable> = new Map();
  private downloadCallbacks: Map<
    string,
    (progress: number, downloadedBytes: number, totalBytes: number) => void
  > = new Map();

  async downloadTrack(
    track: Track,
    playlist: Playlist,
    quality: number,
    onProgress?: (progress: number, downloadedBytes: number, totalBytes: number) => void
  ): Promise<string> {
    const downloadUrl = await this.getDownloadUrl(track.youtubeId, quality);
    const fileName = sanitizeFileName(`${track.artist} - ${track.title}.mp3`);
    const playlistDir = `${getDocumentDirectory()}YTMusicManager/${sanitizeFileName(playlist.name)}/`;
    const filePath = `${playlistDir}${fileName}`;

    await FileSystem.makeDirectoryAsync(playlistDir, { intermediates: true });

    if (onProgress) {
      this.downloadCallbacks.set(track.id, onProgress);
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      filePath,
      {},
      downloadProgress => {
        const progress =
          downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        const callback = this.downloadCallbacks.get(track.id);
        if (callback) {
          callback(
            progress,
            downloadProgress.totalBytesWritten,
            downloadProgress.totalBytesExpectedToWrite
          );
        }
      }
    );

    this.activeDownloads.set(track.id, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      if (!result) {
        throw new Error('Download failed');
      }

      this.activeDownloads.delete(track.id);
      this.downloadCallbacks.delete(track.id);

      return result.uri;
    } catch (error) {
      this.activeDownloads.delete(track.id);
      this.downloadCallbacks.delete(track.id);
      throw error;
    }
  }

  async cancelDownload(trackId: string): Promise<void> {
    const download = this.activeDownloads.get(trackId);
    if (download) {
      await download.pauseAsync();
      this.activeDownloads.delete(trackId);
      this.downloadCallbacks.delete(trackId);
    }
  }

  async pauseDownload(trackId: string): Promise<void> {
    const download = this.activeDownloads.get(trackId);
    if (download) {
      await download.pauseAsync();
    }
  }

  async resumeDownload(trackId: string): Promise<void> {
    const download = this.activeDownloads.get(trackId);
    if (download) {
      await download.resumeAsync();
    }
  }

  private async getDownloadUrl(videoId:  string, quality: AudioQuality): Promise<string> {
  try {
    const BACKEND_URL = 'https://yt-music-manager-backend.onrender.com';
    
    const response = await fetch(
      `${BACKEND_URL}/api/download-info?videoId=${videoId}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to get download URL');
    }
    
    const data = await response. json();
    return data.downloadUrl;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw error;
  }
  }

  async deleteTrackFile(filePath: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
    } catch (error) {
      console.error('Error deleting track file:', error);
      throw error;
    }
  }

  async getDirectorySize(directoryPath: string): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(directoryPath);
      if (!dirInfo.exists) return 0;

      let totalSize = 0;
      const files = await FileSystem.readDirectoryAsync(directoryPath);

      for (const file of files) {
        const filePath = `${directoryPath}/${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error calculating directory size:', error);
      return 0;
    }
  }

  async createM3UPlaylist(playlist: Playlist, tracks: Track[]): Promise<string> {
    const playlistDir = `${getDocumentDirectory()}YTMusicManager/${sanitizeFileName(playlist.name)}/`;
    const m3uPath = `${playlistDir}${sanitizeFileName(playlist.name)}.m3u`;

    const m3uContent = ['#EXTM3U'];

    for (const track of tracks) {
      if (track.filePath && track.downloadStatus === 'completed') {
        m3uContent.push(`#EXTINF:${track.duration},${track.artist} - ${track.title}`);
        m3uContent.push(track.filePath);
      }
    }

    await FileSystem.writeAsStringAsync(m3uPath, m3uContent.join('\n'));
    return m3uPath;
  }
}

export const downloadService = new DownloadService();
