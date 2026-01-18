import { playerService } from '../playerService';
import TrackPlayer, { RepeatMode, State } from 'react-native-track-player';
import { Track } from '../../types';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const mockQueue: Array<any> = [];
let mockCurrentTrackIndex: number | null = 0;

jest.mock('react-native-track-player', () => {
  const mockTrackPlayer = {
    setupPlayer: jest.fn().mockResolvedValue(undefined),
    updateOptions: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn().mockImplementation((_event, _cb) => ({ remove: jest.fn() })),
    reset: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockImplementation(async (tracks: any[], insertBeforeIndex?: number) => {
      if (typeof insertBeforeIndex === 'number') {
        mockQueue.splice(insertBeforeIndex, 0, ...tracks);
      } else {
        mockQueue.push(...tracks);
      }
    }),
    setRepeatMode: jest.fn().mockResolvedValue(undefined),
    skip: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    getState: jest.fn().mockResolvedValue('paused'),
    getQueue: jest.fn().mockImplementation(async () => mockQueue),
    seekTo: jest.fn().mockResolvedValue(undefined),
    getCurrentTrack: jest.fn().mockImplementation(async () => mockCurrentTrackIndex),
    remove: jest.fn().mockImplementation(async (indices: number[]) => {
      const sorted = [...indices].sort((a, b) => b - a);
      for (const idx of sorted) {
        mockQueue.splice(idx, 1);
      }
    }),
    stop: jest.fn().mockResolvedValue(undefined),
  };

  return {
    __esModule: true,
    default: mockTrackPlayer,
    AppKilledPlaybackBehavior: {
      StopPlaybackAndRemoveNotification: 'stop',
    },
    Capability: {
      Play: 'play',
      Pause: 'pause',
      SkipToNext: 'next',
      SkipToPrevious: 'prev',
      SeekTo: 'seek',
    },
    Event: {
      PlaybackState: 'playback-state',
      PlaybackProgressUpdated: 'progress',
      PlaybackTrackChanged: 'track-changed',
    },
    RepeatMode: {
      Off: 'off',
      Track: 'track',
      Queue: 'queue',
    },
    State: {
      Playing: 'playing',
      Buffering: 'buffering',
      Loading: 'loading',
      Paused: 'paused',
    },
  };
});

describe('playerService', () => {
  const track1: Track = {
    id: 'track-1',
    playlistId: 'playlist-1',
    title: 'Track 1',
    artist: 'Artist 1',
    duration: 120,
    fileSize: 0,
    filePath: 'file:///track1.mp3',
    downloadStatus: 'completed',
    downloadProgress: 1,
    youtubeId: 'yt1',
    position: 0,
  };

  const track2: Track = {
    id: 'track-2',
    playlistId: 'playlist-1',
    title: 'Track 2',
    artist: 'Artist 2',
    duration: 180,
    fileSize: 0,
    filePath: 'file:///track2.mp3',
    downloadStatus: 'completed',
    downloadProgress: 1,
    youtubeId: 'yt2',
    position: 0,
  };

  beforeEach(async () => {
    mockQueue.length = 0;
    mockCurrentTrackIndex = 0;
    jest.clearAllMocks();
    await playerService.stop();

    while (playerService.getState().repeatMode !== 'off') {
      playerService.toggleRepeatMode();
    }

    if (playerService.getState().shuffleEnabled) {
      playerService.toggleShuffle();
    }
  });

  it('should load and play track', async () => {
    await playerService.loadTrack(track1, [track1, track2], 0);

    expect(TrackPlayer.reset).toHaveBeenCalled();
    expect(TrackPlayer.add).toHaveBeenCalled();
    expect(TrackPlayer.skip).toHaveBeenCalledWith(0);
    expect(TrackPlayer.play).toHaveBeenCalled();

    const state = playerService.getState();
    expect(state.currentTrack?.id).toBe('track-1');
    expect(state.isPlaying).toBe(true);
  });

  it('should toggle play/pause based on state', async () => {
    (TrackPlayer.getState as jest.Mock).mockResolvedValueOnce(State.Playing);
    await playerService.togglePlayPause();
    expect(TrackPlayer.pause).toHaveBeenCalled();

    (TrackPlayer.getState as jest.Mock).mockResolvedValueOnce(State.Paused);
    await playerService.togglePlayPause();
    expect(TrackPlayer.play).toHaveBeenCalled();
  });

  it('should play next track', async () => {
    await playerService.loadTrack(track1, [track1, track2], 0);

    await playerService.playNext();

    expect(TrackPlayer.skip).toHaveBeenCalledWith(1);
    expect(playerService.getState().currentIndex).toBe(1);
  });

  it('should play previous track when not at start', async () => {
    await playerService.loadTrack(track2, [track1, track2], 1);

    await playerService.playPrevious();

    expect(TrackPlayer.skip).toHaveBeenCalledWith(0);
    expect(playerService.getState().currentIndex).toBe(0);
  });

  it('should restart current track when seeking back within 3 seconds threshold', async () => {
    await playerService.loadTrack(track1, [track1, track2], 0);
    await playerService.seekTo(5);

    await playerService.playPrevious();

    expect(TrackPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(playerService.getState().position).toBe(0);
  });

  it('should toggle repeat mode', () => {
    playerService.toggleRepeatMode();

    expect(TrackPlayer.setRepeatMode).toHaveBeenCalledWith(RepeatMode.Queue);
    expect(playerService.getState().repeatMode).toBe('all');
  });

  it('should wrap next track when repeat all is enabled', async () => {
    await playerService.loadTrack(track2, [track1, track2], 1);
    while (playerService.getState().repeatMode !== 'all') {
      playerService.toggleRepeatMode();
    }

    await playerService.playNext();

    expect(TrackPlayer.skip).toHaveBeenCalledWith(0);
    expect(playerService.getState().currentIndex).toBe(0);
  });

  it('should play track at index', async () => {
    await playerService.loadTrack(track1, [track1, track2], 0);

    await playerService.playTrackAtIndex(1);

    expect(TrackPlayer.skip).toHaveBeenCalledWith(1);
    expect(TrackPlayer.play).toHaveBeenCalled();
    expect(playerService.getState().currentTrack?.id).toBe('track-2');
  });

  it('should toggle shuffle when no current track', () => {
    playerService.toggleShuffle();

    expect(playerService.getState().shuffleEnabled).toBe(true);
  });

  it('should toggle shuffle with active queue and sync native queue', async () => {
    await playerService.loadTrack(track1, [track1, track2], 0);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.4);

    playerService.toggleShuffle();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(TrackPlayer.remove).toHaveBeenCalled();
    expect(TrackPlayer.add).toHaveBeenCalled();
    expect(playerService.getState().shuffleEnabled).toBe(true);
    randomSpy.mockRestore();
  });

  it('should report play next/previous availability', async () => {
    await playerService.loadTrack(track1, [track1, track2], 0);

    expect(playerService.canPlayNext()).toBe(true);
    expect(playerService.canPlayPrevious()).toBe(false);
  });
});
