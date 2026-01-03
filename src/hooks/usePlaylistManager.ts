import { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Playlist, Track } from '../types';
import { youtubeApi } from '../services/youtubeApi';
import { extractPlaylistId } from '../utils/formatters';
import { downloadService } from '../services/downloadService';
import { YOUTUBE_API_KEY } from '../constants';

export const usePlaylistManager = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPlaylist = async (urlOrId: string): Promise<Playlist | null> => {
    setLoading(true);
    setError(null);

    try {
      const playlistId = extractPlaylistId(urlOrId);
      if (!playlistId) {
        throw new Error('Invalid playlist URL or ID');
      }

      const existingPlaylist = state.playlists.find(p => p.id === playlistId);
      if (existingPlaylist) {
        throw new Error('Playlist already exists');
      }

      // Set API key for YouTube Data API requests
      youtubeApi.setApiKey(YOUTUBE_API_KEY);

      if (state.auth.accessToken) {
        youtubeApi.setAccessToken(state.auth.accessToken);
      }

      const playlistInfo = await youtubeApi.getPlaylistInfo(playlistId);
      const videos = await youtubeApi.getPlaylistVideos(playlistId);

      const playlist: Playlist = {
        id: playlistId,
        name: playlistInfo.title,
        url: `https://www.youtube.com/playlist?list=${playlistId}`,
        trackCount: videos.length,
        totalSize: 0,
        lastSynced: null,
        dateAdded: new Date().toISOString(),
        syncStatus: 'idle',
        thumbnailUrl: playlistInfo.thumbnailUrl,
        description: playlistInfo.description,
      };

      const tracks: Track[] = videos.map((video, index) => ({
        id: `${playlistId}-${video.id}`,
        playlistId,
        title: video.title,
        artist: video.artist,
        duration: video.duration,
        fileSize: 0,
        filePath: null,
        downloadStatus: 'pending',
        downloadProgress: 0,
        thumbnailUrl: video.thumbnailUrl,
        youtubeId: video.id,
        position: index,
      }));

      dispatch({ type: 'ADD_PLAYLIST', payload: playlist });
      dispatch({ type: 'ADD_TRACKS', payload: tracks });

      setLoading(false);
      return playlist;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add playlist';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  const removePlaylist = async (playlistId: string, deleteFiles: boolean): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (!playlist) {
        throw new Error('Playlist not found');
      }

      const tracks = state.tracks.filter(t => t.playlistId === playlistId);

      if (deleteFiles) {
        for (const track of tracks) {
          if (track.filePath) {
            await downloadService.deleteTrackFile(track.filePath);
          }
        }
      }

      dispatch({ type: 'REMOVE_PLAYLIST', payload: playlistId });
      dispatch({
        type: 'REMOVE_TRACKS',
        payload: tracks.map(t => t.id),
      });

      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove playlist';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const syncPlaylist = async (playlistId: string, dryRun: boolean = false): Promise<any> => {
    setLoading(true);
    setError(null);

    try {
      const playlist = state.playlists.find(p => p.id === playlistId);
      if (!playlist) {
        throw new Error('Playlist not found');
      }

      if (!dryRun) {
        dispatch({
          type: 'UPDATE_PLAYLIST',
          payload: { ...playlist, syncStatus: 'syncing' },
        });
      }

      // Set API key for YouTube Data API requests
      youtubeApi.setApiKey(YOUTUBE_API_KEY);

      if (state.auth.accessToken) {
        youtubeApi.setAccessToken(state.auth.accessToken);
      }

      const videos = await youtubeApi.getPlaylistVideos(playlistId);
      const existingTracks = state.tracks.filter(t => t.playlistId === playlistId);

      const tracksToAdd = videos.filter(
        video => !existingTracks.some(track => track.youtubeId === video.id)
      );

      const tracksToRemove = existingTracks.filter(
        track => !videos.some(video => video.id === track.youtubeId)
      );

      if (dryRun) {
        const newTracks: Track[] = tracksToAdd.map((video, index) => ({
          id: `${playlistId}-${video.id}`,
          playlistId,
          title: video.title,
          artist: video.artist,
          duration: video.duration,
          fileSize: 0,
          filePath: null,
          downloadStatus: 'pending' as const,
          downloadProgress: 0,
          thumbnailUrl: video.thumbnailUrl,
          youtubeId: video.id,
          position: existingTracks.length + index,
        }));

        setLoading(false);
        return {
          tracksToAdd: newTracks,
          tracksToRemove,
          totalDownloadSize: 0,
        };
      }

      if (tracksToRemove.length > 0) {
        for (const track of tracksToRemove) {
          if (track.filePath) {
            await downloadService.deleteTrackFile(track.filePath);
          }
        }

        dispatch({
          type: 'REMOVE_TRACKS',
          payload: tracksToRemove.map(t => t.id),
        });
      }

      if (tracksToAdd.length > 0) {
        const newTracks: Track[] = tracksToAdd.map((video, index) => ({
          id: `${playlistId}-${video.id}`,
          playlistId,
          title: video.title,
          artist: video.artist,
          duration: video.duration,
          fileSize: 0,
          filePath: null,
          downloadStatus: 'pending' as const,
          downloadProgress: 0,
          thumbnailUrl: video.thumbnailUrl,
          youtubeId: video.id,
          position: existingTracks.length + index,
        }));

        dispatch({ type: 'ADD_TRACKS', payload: newTracks });
      }

      const updatedPlaylist: Playlist = {
        ...playlist,
        trackCount: videos.length,
        lastSynced: new Date().toISOString(),
        syncStatus: 'completed',
      };

      dispatch({ type: 'UPDATE_PLAYLIST', payload: updatedPlaylist });

      setLoading(false);
      return {
        tracksToAdd: [],
        tracksToRemove: [],
        totalDownloadSize: 0,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync playlist';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  return {
    addPlaylist,
    removePlaylist,
    syncPlaylist,
    loading,
    error,
  };
};
