import { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Track } from '../types';
import { downloadService } from '../services/downloadService';
import { youtubeApi } from '../services/youtubeApi';
import { useStoragePermission } from './useStoragePermission';

export const useDownloadManager = () => {
  const { state, dispatch } = useAppContext();
  const { checkAndSetupStorage } = useStoragePermission();
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(new Set());

  const downloadTrack = async (track: Track, options: { skipStorageCheck?: boolean } = {}): Promise<void> => {
    if (!options.skipStorageCheck) {
      const ok = await checkAndSetupStorage();
      if (!ok) {
        throw new Error('Folder selection is required before downloading.');
      }
    }

    if (activeDownloads.has(track.id)) {
      return;
    }

    const playlist = state.playlists.find(p => p.id === track.playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    setActiveDownloads(prev => new Set(prev).add(track.id));

    dispatch({
      type: 'UPDATE_TRACK',
      payload: { ...track, downloadStatus: 'downloading', downloadProgress: 0 },
    });

    try {
      let lastKnownBytes = 0;
      const filePath = await downloadService.downloadTrack(
        track,
        playlist,
        state.settings.audioQuality,
        (progress, downloadedBytes, totalBytes) => {
          const sizeForState = totalBytes > 0 ? totalBytes : Math.max(0, downloadedBytes);
          lastKnownBytes = Math.max(lastKnownBytes, sizeForState);
          // Only dispatch if progress has changed significantly to reduce multiple renders
          // Or just dispatch every time, but throttling might be needed if it's too frequent
          dispatch({
            type: 'UPDATE_TRACK',
            payload: {
              ...track,
              // IMPORTANT: keep status as 'downloading' while progress updates stream in.
              // Otherwise, spreading the original track (often 'pending') flips the UI back to "Ready to download".
              downloadStatus: 'downloading',
              downloadProgress: progress,
              fileSize: sizeForState,
            },
          });
        }
      );

      // Get actual file size after download
      const FileSystem = await import('expo-file-system/legacy');
      let actualFileSize = 0;
      if (filePath.startsWith('content://')) {
        // SAF URIs don't support getInfoAsync; use last known bytes from the download stream.
        actualFileSize = lastKnownBytes;
      } else {
        try {
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          actualFileSize = fileInfo.exists && !fileInfo.isDirectory ? (fileInfo.size || 0) : 0;
        } catch (err) {
          console.error('Error getting file size:', err);
        }
      }

      // Integrity Check: If file is too small (e.g. < 5KB), it's likely an error page or corrupted.
      if (!filePath.startsWith('content://') && actualFileSize < 5 * 1024) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
        throw new Error('Downloaded file is too small (possible error page)');
      }

      dispatch({
        type: 'UPDATE_TRACK',
        payload: {
          ...track,
          downloadStatus: 'completed',
          downloadProgress: 1,
          filePath,
          fileSize: actualFileSize,
        },
      });

      setActiveDownloads(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    } catch (error) {
      console.error(`Download failed for track ${track.title}:`, error);
      dispatch({
        type: 'UPDATE_TRACK',
        payload: { ...track, downloadStatus: 'error', downloadProgress: 0 },
      });

      setActiveDownloads(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });

      throw error;
    }
  };

  const downloadPlaylist = async (playlistId: string): Promise<{ success: number; failed: number }> => {
    // Ensure storage is set up before starting the batch
    const ok = await checkAndSetupStorage();
    if (!ok) {
      throw new Error('Folder selection is required before downloading.');
    }

    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    dispatch({
      type: 'UPDATE_PLAYLIST',
      payload: { ...playlist, syncStatus: 'downloading' },
    });

    const tracks = state.tracks.filter(
      t => t.playlistId === playlistId && t.downloadStatus !== 'completed'
    );

    const maxConcurrent = state.settings.maxConcurrentDownloads;
    const queue = [...tracks];
    let successCount = 0;
    let failedCount = 0;

    const downloadNext = async () => {
      if (queue.length === 0) return;

      const track = queue.shift();
      if (!track) return;

      try {
        await downloadTrack(track, { skipStorageCheck: true });
        successCount++;
      } catch (error) {
        console.error(`Failed to download track ${track.id}:`, error);
        failedCount++;
      }

      await downloadNext();
    };

    const promises = Array(Math.min(maxConcurrent, tracks.length))
      .fill(null)
      .map(() => downloadNext());

    await Promise.all(promises);

    await downloadService.createM3UPlaylist(
      playlist,
      state.tracks.filter(t => t.playlistId === playlistId)
    );

    // Calculate total size from all completed tracks
    const completedTracks = state.tracks.filter(
      t => t.playlistId === playlistId && t.downloadStatus === 'completed'
    );
    const totalSize = completedTracks.reduce((sum, t) => sum + (t.fileSize || 0), 0);

    dispatch({
      type: 'UPDATE_PLAYLIST',
      payload: {
        ...playlist,
        syncStatus: failedCount > 0 ? 'error' : 'completed',
        totalSize,
        lastSynced: new Date().toISOString(),
      },
    });

    return { success: successCount, failed: failedCount };
  };

  const syncPlaylist = async (playlistId: string): Promise<{ success: number; failed: number }> => {
    // Ensure storage is set up before starting sync
    const ok = await checkAndSetupStorage();
    if (!ok) {
      throw new Error('Folder selection is required before syncing.');
    }

    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    try {
      // 1. Fetch latest videos from backend
      const latestVideos = await youtubeApi.getPlaylistVideos(playlistId);

      // 2. Compare with local state
      const existingTracks = state.tracks.filter(t => t.playlistId === playlistId);
      const existingVideoIds = new Set(existingTracks.map(t => t.youtubeId));

      // Identify new tracks
      const newVideos = latestVideos.filter(v => !existingVideoIds.has(v.id));

      // Identify removed tracks (video ID in local but not in latest)
      const latestVideoIds = new Set(latestVideos.map(v => v.id));
      const removedTracks = existingTracks.filter(t => !latestVideoIds.has(t.youtubeId));

      // 3. Add new tracks to state
      if (newVideos.length > 0) {
        const newTracks: Track[] = newVideos.map((video, index) => ({
          id: video.id, // Using youtube ID as ID for simplicity, or generate UUID
          youtubeId: video.id,
          title: video.title,
          artist: video.artist,
          duration: video.duration,
          thumbnailUrl: video.thumbnailUrl,
          playlistId: playlistId,
          downloadStatus: 'pending',
          downloadProgress: 0,
          filePath: '',
          fileSize: 0,
          position: index, // Append or re-index? Simple append for now
          createdAt: new Date().toISOString(),
        }));

        dispatch({ type: 'ADD_TRACKS', payload: newTracks });
      }

      // 4. Remove old tracks from state and filesystem
      if (removedTracks.length > 0) {
        // Delete files
        for (const track of removedTracks) {
          if (track.filePath) {
            await downloadService.deleteTrackFile(track.filePath);
          }
        }

        // Remove from state
        dispatch({ type: 'REMOVE_TRACKS', payload: removedTracks.map(t => t.id) });
      }

      // 5. Trigger download for all pending tracks (including new ones)
      // We return the result of downloadPlaylist so the UI can show the report
      return await downloadPlaylist(playlistId);

    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  };

  const cancelDownload = async (trackId: string): Promise<void> => {
    await downloadService.cancelDownload(trackId);
    setActiveDownloads(prev => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });

    const track = state.tracks.find(t => t.id === trackId);
    if (track) {
      dispatch({
        type: 'UPDATE_TRACK',
        payload: { ...track, downloadStatus: 'pending', downloadProgress: 0 },
      });
    }
  };

  return {
    downloadTrack,
    downloadPlaylist,
    syncPlaylist,
    cancelDownload,
    activeDownloads: Array.from(activeDownloads),
  };
};
