import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track, Playlist } from '../types';
import { sanitizeFileName } from '../utils/formatters';
import { DEFAULT_BACKEND_URL, STORAGE_KEYS } from '../constants';
import { addToDownloadIndex, removeFromDownloadIndex } from '../utils/downloadIndex';

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
  private backendUrl: string = DEFAULT_BACKEND_URL;

  setBackendUrl(url: string) {
    this.backendUrl = url;
  }

  private getSafDisplayNameFromUri(uri: string): string {
    const marker = 'document/';
    const idx = uri.indexOf(marker);
    if (idx >= 0) {
      const encodedDocId = uri.substring(idx + marker.length);
      const decodedDocId = decodeURIComponent(encodedDocId);
      // Strip trailing slash if present to avoid empty string splits
      const cleanDocId = decodedDocId.endsWith('/') ? decodedDocId.slice(0, -1) : decodedDocId;
      const parts = cleanDocId.split('/');
      const last = parts[parts.length - 1];

      // Some providers (e.g. SD card root) might format ID as "volume:Folder".
      // We want just "Folder".
      if (last && last.includes(':')) {
        const colonParts = last.split(':');
        return colonParts[colonParts.length - 1];
      }

      if (last) return last;
    }
    // Fallback for unexpected URI formats
    return decodeURIComponent(uri.split('/').pop() || '');
  }

  async downloadTrack(
    track: Track,
    playlist: Playlist,
    quality: number,
    onProgress?: (progress: number, downloadedBytes: number, totalBytes: number) => void
  ): Promise<string> {
    // UPDATED: Now points to the stream endpoint instead of just getting metadata
    const downloadUrl = `${this.backendUrl}/api/download?videoId=${track.youtubeId}`;
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

        // Integrity check on the cache file (file://), since getInfoAsync isn't supported for SAF content:// URIs.
        const cacheInfo = await FileSystem.getInfoAsync(result.uri);
        const cacheSize = cacheInfo.exists && !cacheInfo.isDirectory ? cacheInfo.size || 0 : 0;
        if (cacheSize < 5 * 1024) {
          await FileSystem.deleteAsync(result.uri, { idempotent: true });
          throw new Error('Downloaded file is too small (possible error page)');
        }

        // 2. Read file as Base64 (needed for SAF write)
        const fileContent = await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // 3. Create SAF folder structure: [User Selected Folder]/YT Music Manager/[PlaylistID_PlaylistName]/
        const rootUri: string = settings.downloadPath;

        // If the saved URI already points at "YT Music Manager", avoid nesting.
        const rootName = this.getSafDisplayNameFromUri(rootUri);
        const appFolderUri =
          rootName === 'YT Music Manager'
            ? rootUri
            : await this.getOrCreateSAFFolder(rootUri, 'YT Music Manager');

        // Create unique playlist folder (using playlist ID to ensure uniqueness)
        const playlistFolderName = sanitizeFileName(`${playlist.id}_${playlist.name}`);
        const playlistFolderUri = await this.getOrCreateSAFFolder(appFolderUri, playlistFolderName);

        // 4. Create file in playlist folder
        const mimeType = 'audio/mp4'; // m4a
        const createdFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          playlistFolderUri,
          fileName,
          mimeType
        );

        await FileSystem.writeAsStringAsync(createdFileUri, fileContent, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // 5. Cleanup cache
        await FileSystem.deleteAsync(result.uri, { idempotent: true });

        // Track storage usage even if the playlist is removed later.
        await addToDownloadIndex(createdFileUri, cacheSize);

        return createdFileUri;
      } catch (error) {
        this.activeDownloads.delete(track.id);
        this.downloadCallbacks.delete(track.id);
        throw error;
      }
    }

    // DEFAULT INTERNAL LOGIC (though now mandatory to use SAF)
    const playlistFolderName = sanitizeFileName(`${playlist.id}_${playlist.name}`);
    const playlistDir = `${getDocumentDirectory()}YTMusicManager/${playlistFolderName}/`;
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

      if (!result) {
        throw new Error('Download failed: No result returned');
      }

      // 4. CHECK HTTP STATUS
      if (result.status && result.status !== 200) {
        // Delete the file because it likely contains an HTML error page
        await FileSystem.deleteAsync(filePath).catch(() => {});
        throw new Error(`Download failed with status ${result.status}`);
      }

      // Track storage usage for internal storage too.
      try {
        const info = await FileSystem.getInfoAsync(result.uri);
        const size = info.exists && !info.isDirectory ? info.size || 0 : 0;
        await addToDownloadIndex(result.uri, size);
      } catch {
        // Best-effort
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
      // getInfoAsync is not supported for SAF content:// URIs on Android.
      // deleteAsync is best-effort and idempotent.
      if (
        filePath.startsWith('content://') &&
        (FileSystem as any).StorageAccessFramework?.deleteAsync
      ) {
        await (FileSystem as any).StorageAccessFramework.deleteAsync(filePath, {
          idempotent: true,
        });
      } else {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
    } catch (error) {
      console.error('Error deleting track file:', error);
      // Best-effort deletion; don't crash sync/cleanup flows.
    } finally {
      // Keep index in sync with deletions.
      await removeFromDownloadIndex(filePath);
    }
  }

  async deletePlaylistFolder(playlist: Playlist): Promise<void> {
    try {
      const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = settingsStr ? JSON.parse(settingsStr) : null;
      const isCustom =
        settings?.storageLocationType === 'custom' &&
        typeof settings?.downloadPath === 'string' &&
        settings.downloadPath.length > 0 &&
        !!(FileSystem as any).StorageAccessFramework;

      const playlistFolderName = sanitizeFileName(`${playlist.id}_${playlist.name}`);

      if (isCustom) {
        // SAF: Delete playlist folder
        const rootUri: string = settings.downloadPath;
        const rootName = this.getSafDisplayNameFromUri(rootUri);
        const appFolderUri =
          rootName === 'YT Music Manager'
            ? rootUri
            : await this.getOrCreateSAFFolder(rootUri, 'YT Music Manager').catch(() => rootUri);

        // Find and delete playlist folder
        try {
          const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(appFolderUri);
          for (const childUri of children) {
            const childName = this.getSafDisplayNameFromUri(childUri);
            if (childName === playlistFolderName) {
              await FileSystem.StorageAccessFramework.deleteAsync(childUri, { idempotent: true });
              break;
            }
          }
        } catch (safErr) {
          console.error('Error deleting SAF playlist folder:', safErr);
        }
      } else {
        // Internal: Delete playlist folder
        const playlistDir = `${getDocumentDirectory()}YTMusicManager/${playlistFolderName}/`;
        try {
          const dirInfo = await FileSystem.getInfoAsync(playlistDir);
          if (dirInfo.exists) {
            await FileSystem.deleteAsync(playlistDir, { idempotent: true });
          }
        } catch (internalErr) {
          console.error('Error deleting internal playlist folder:', internalErr);
        }
      }
    } catch (error) {
      console.error('Error deleting playlist folder:', error);
    }
  }

  async getDirectorySize(directoryPath: string): Promise<number> {
    try {
      if (directoryPath.startsWith('content://')) {
        // SAF directory size requires querying DocumentFile metadata; not available in expo-file-system.
        return 0;
      }
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
    // Prefer SAF if configured so the playlist file lives beside the downloaded tracks.
    const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    const settings = settingsStr ? JSON.parse(settingsStr) : null;
    const isCustom =
      settings?.storageLocationType === 'custom' &&
      typeof settings?.downloadPath === 'string' &&
      settings.downloadPath.length > 0 &&
      !!(FileSystem as any).StorageAccessFramework;

    const playlistFolderName = sanitizeFileName(`${playlist.id}_${playlist.name}`);

    let m3uPath: string;
    if (isCustom) {
      const rootUri: string = settings.downloadPath;
      const rootName = this.getSafDisplayNameFromUri(rootUri);
      const appFolderUri =
        rootName === 'YT Music Manager'
          ? rootUri
          : await this.getOrCreateSAFFolder(rootUri, 'YT Music Manager');
      const playlistFolderUri = await this.getOrCreateSAFFolder(appFolderUri, playlistFolderName);

      // Check if M3U already exists to prevent duplication
      const m3uName = `${sanitizeFileName(playlist.name)}.m3u`;
      const children =
        await FileSystem.StorageAccessFramework.readDirectoryAsync(playlistFolderUri);
      let existingM3uUri: string | null = null;

      for (const childUri of children) {
        if (this.getSafDisplayNameFromUri(childUri) === m3uName) {
          existingM3uUri = childUri;
          break;
        }
      }

      if (existingM3uUri) {
        m3uPath = existingM3uUri;
      } else {
        // Create M3U inside the playlist folder
        m3uPath = await FileSystem.StorageAccessFramework.createFileAsync(
          playlistFolderUri,
          m3uName,
          'audio/x-mpegurl'
        );
      }
    } else {
      const playlistDir = `${getDocumentDirectory()}YTMusicManager/${playlistFolderName}/`;
      m3uPath = `${playlistDir}${sanitizeFileName(playlist.name)}.m3u`;
    }

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

  /**
   * Get or create a folder in SAF (Storage Access Framework)
   * @param parentUri The parent directory URI
   * @param folderName The name of the folder to get or create
   * @returns The URI of the folder
   */
  private async getOrCreateSAFFolder(parentUri: string, folderName: string): Promise<string> {
    try {
      // List existing children to check if folder exists
      const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);

      for (const childUri of children) {
        // NOTE: getInfoAsync is not implemented for SAF content:// URIs.
        // We detect the display name from the documentId within the URI.
        const childName = this.getSafDisplayNameFromUri(childUri);
        if (childName === folderName) {
          return childUri;
        }
      }

      // Folder doesn't exist, create it
      const newFolderUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(
        parentUri,
        folderName
      );
      return newFolderUri;
    } catch (error) {
      console.error('Error getting or creating SAF folder:', error);
      throw error;
    }
  }
}

export const downloadService = new DownloadService();
