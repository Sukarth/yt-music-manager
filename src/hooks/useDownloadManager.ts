import { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Track } from '../types';
import { downloadService } from '../services/downloadService';

export const useDownloadManager = () => {
  const { state, dispatch } = useAppContext();
  const [activeDownloads, setActiveDownloads] = useState<Set<string>>(new Set());

  const downloadTrack = async (track: Track): Promise<void> => {
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
      const filePath = await downloadService.downloadTrack(
        track,
        playlist,
        state.settings.audioQuality,
        (progress, downloadedBytes, totalBytes) => {
          dispatch({
            type: 'UPDATE_TRACK',
            payload: {
              ...track,
              downloadProgress: progress,
              fileSize: totalBytes,
            },
          });
        }
      );

      dispatch({
        type: 'UPDATE_TRACK',
        payload: {
          ...track,
          downloadStatus: 'completed',
          downloadProgress: 1,
          filePath,
        },
      });

      setActiveDownloads(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });
    } catch (error) {
      dispatch({
        type: 'UPDATE_TRACK',
        payload: { ...track, downloadStatus: 'error' },
      });

      setActiveDownloads(prev => {
        const next = new Set(prev);
        next.delete(track.id);
        return next;
      });

      throw error;
    }
  };

  const downloadPlaylist = async (playlistId: string): Promise<void> => {
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

    const downloadNext = async () => {
      if (queue.length === 0) return;

      const track = queue.shift();
      if (!track) return;

      try {
        await downloadTrack(track);
      } catch (error) {
        console.error(`Failed to download track ${track.id}:`, error);
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

    dispatch({
      type: 'UPDATE_PLAYLIST',
      payload: { ...playlist, syncStatus: 'completed' },
    });
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
    cancelDownload,
    activeDownloads: Array.from(activeDownloads),
  };
};
