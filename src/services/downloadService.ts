import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track, Playlist } from '../types';
import { sanitizeFileName } from '../utils/formatters';
import { BACKEND_URL, STORAGE_KEYS } from '../constants';

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
    // UPDATED: Now points to the stream endpoint instead of just getting metadata
    const downloadUrl = `${BACKEND_URL}/api/download?videoId=${track.youtubeId}`;
    const fileName = sanitizeFileName(`${track.artist} - ${track.title}.m4a`);

    // Determine download location from persisted settings.
    const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    const settings = settingsStr ? JSON.parse(settingsStr) : null;
    const isCustom =
      settings?.storageLocationType === 'custom' &&
      typeof settings?.downloadPath === 'string' &&
      settings.downloadPath.length > 0 &&
      !!(FileSystem as any).StorageAccessFramework;

    if (isCustom) {
      // ANDROID CUSTOM SAF LOGIC
      // 1. Download to cache first
      const cachePath = `${FileSystem.cacheDirectory}${fileName}`;

      if (onProgress) {
        this.downloadCallbacks.set(track.id, onProgress);
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        cachePath,
        {},
        downloadProgress => {
          const totalBytes = downloadProgress.totalBytesExpectedToWrite;
          const downloadedBytes = downloadProgress.totalBytesWritten;

          const progressRaw = totalBytes > 0 ? downloadedBytes / totalBytes : 0;
          const progress = Number.isFinite(progressRaw) ? Math.min(1, Math.max(0, progressRaw)) : 0;
          const callback = this.downloadCallbacks.get(track.id);
          if (callback) {
            callback(progress, downloadedBytes, totalBytes);
          }
        }
      );

      this.activeDownloads.set(track.id, downloadResumable);

      try {
        const result = await downloadResumable.downloadAsync();
        this.activeDownloads.delete(track.id);
        this.downloadCallbacks.delete(track.id);

        if (!result || result.status !== 200) {
          throw new Error(`Download failed with status ${result?.status}`);
        }

        // 2. Read file as Base64 (needed for SAF write)
        const fileContent = await FileSystem.readAsStringAsync(result.uri, { encoding: FileSystem.EncodingType.Base64 });

        // 3. Create file in SAF location
        // Ensure playlist folder exists in SAF? SAF is flat or hierarchical?
        // We stored the ROOT folder URI in settings.downloadPath
        const rootUri: string = settings.downloadPath;

        // We can't easily make subfolders in SAF without more complex logic (iterating to find if exists).
        // For MVP, we will save FLAT in the chosen folder, or try to create subfolder if possible.
        // Let's save FLAT for now or try to create a subfolder for "YTMusicManager" if the root is generic.

        // Actually, implementing full SAF subfolder creation is complex. 
        // Let's just create the file in the permitted URI.

        const mimeType = 'audio/mp4'; // m4a
        const createdFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          rootUri,
          fileName,
          mimeType
        );

        await FileSystem.writeAsStringAsync(createdFileUri, fileContent, { encoding: FileSystem.EncodingType.Base64 });

        // 4. Cleanup cache
        await FileSystem.deleteAsync(result.uri, { idempotent: true });

        return createdFileUri;

      } catch (error) {
        this.activeDownloads.delete(track.id);
        this.downloadCallbacks.delete(track.id);
        throw error;
      }

    }

    // DEFAULT INTERNAL LOGIC
    const playlistDir = `${getDocumentDirectory()}YTMusicManager/${sanitizeFileName(playlist.name)}/`;
    const filePath = `${playlistDir}${fileName}`;

    try {
      await FileSystem.makeDirectoryAsync(playlistDir, { intermediates: true });
    } catch (error) {
      console.log('Directory creation warning/error (ignoring check):', error);
    }

    if (onProgress) {
      this.downloadCallbacks.set(track.id, onProgress);
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      filePath,
      {},
      downloadProgress => {
        const totalBytes = downloadProgress.totalBytesExpectedToWrite;
        const downloadedBytes = downloadProgress.totalBytesWritten;

        // NOTE: When the server doesn't send a Content-Length header, Expo reports
        // totalBytesExpectedToWrite as 0 or -1. In that case, percentage progress is unknown.
        const progressRaw = totalBytes > 0 ? downloadedBytes / totalBytes : 0;
        const progress = Number.isFinite(progressRaw)
          ? Math.min(1, Math.max(0, progressRaw))
          : 0;
        const callback = this.downloadCallbacks.get(track.id);
        if (callback) {
          callback(
            progress,
            downloadedBytes,
            totalBytes
          );
        }
      }
    );

    this.activeDownloads.set(track.id, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();

      this.activeDownloads.delete(track.id);
      this.downloadCallbacks.delete(track.id);

      if (!result) {
        throw new Error('Download failed: No result returned');
      }

      // 4. CHECK HTTP STATUS
      if (result.status && result.status !== 200) {
        // Delete the file because it likely contains an HTML error page
        await FileSystem.deleteAsync(filePath).catch(() => { });
        throw new Error(`Download failed with status ${result.status}`);
      }

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
