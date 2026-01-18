import { useState, useEffect, useCallback } from 'react';
import { playerService, PlayerState, RepeatMode } from '../services/playerService';
import { Track } from '../types';

export interface UsePlayerReturn {
  // State
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  queue: Track[];
  currentIndex: number;

  // Actions
  loadTrack: (track: Track, queue?: Track[], startIndex?: number) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  playTrackAtIndex: (index: number) => Promise<void>;
  toggleRepeatMode: () => void;
  toggleShuffle: () => void;
  stop: () => Promise<void>;

  // Helpers
  canPlayNext: boolean;
  canPlayPrevious: boolean;
  progress: number;
}

export function usePlayer(): UsePlayerReturn {
  const [state, setState] = useState<PlayerState>(playerService.getState());

  useEffect(() => {
    const unsubscribe = playerService.subscribe(setState);
    return unsubscribe;
  }, []);

  const loadTrack = useCallback(async (track: Track, queue?: Track[], startIndex?: number) => {
    await playerService.loadTrack(track, queue, startIndex);
  }, []);

  const play = useCallback(async () => {
    await playerService.play();
  }, []);

  const pause = useCallback(async () => {
    await playerService.pause();
  }, []);

  const togglePlayPause = useCallback(async () => {
    await playerService.togglePlayPause();
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    await playerService.seekTo(seconds);
  }, []);

  const playNext = useCallback(async () => {
    await playerService.playNext();
  }, []);

  const playPrevious = useCallback(async () => {
    await playerService.playPrevious();
  }, []);

  const playTrackAtIndex = useCallback(async (index: number) => {
    await playerService.playTrackAtIndex(index);
  }, []);

  const toggleRepeatMode = useCallback(() => {
    playerService.toggleRepeatMode();
  }, []);

  const toggleShuffle = useCallback(() => {
    playerService.toggleShuffle();
  }, []);

  const stop = useCallback(async () => {
    await playerService.stop();
  }, []);

  return {
    // State
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    position: state.position,
    duration: state.duration,
    repeatMode: state.repeatMode,
    shuffleEnabled: state.shuffleEnabled,
    queue: state.queue,
    currentIndex: state.currentIndex,

    // Actions
    loadTrack,
    play,
    pause,
    togglePlayPause,
    seekTo,
    playNext,
    playPrevious,
    playTrackAtIndex,
    toggleRepeatMode,
    toggleShuffle,
    stop,

    // Helpers
    canPlayNext: playerService.canPlayNext(),
    canPlayPrevious: playerService.canPlayPrevious(),
    progress: state.duration > 0 ? state.position / state.duration : 0,
  };
}
