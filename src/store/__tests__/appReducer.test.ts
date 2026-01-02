import { Playlist, Track, AppSettings, AuthState, AppState } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants';

// Extract the reducer logic for testing
type AppAction =
  | { type: 'SET_PLAYLISTS'; payload: Playlist[] }
  | { type: 'ADD_PLAYLIST'; payload: Playlist }
  | { type: 'UPDATE_PLAYLIST'; payload: Playlist }
  | { type: 'REMOVE_PLAYLIST'; payload: string }
  | { type: 'SET_TRACKS'; payload: Track[] }
  | { type: 'ADD_TRACKS'; payload: Track[] }
  | { type: 'UPDATE_TRACK'; payload: Track }
  | { type: 'REMOVE_TRACKS'; payload: string[] }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_AUTH'; payload: AuthState }
  | { type: 'SET_CURRENT_PLAYING_TRACK'; payload: Track | null }
  | { type: 'ADD_TO_DOWNLOAD_QUEUE'; payload: any }
  | { type: 'REMOVE_FROM_DOWNLOAD_QUEUE'; payload: string }
  | { type: 'UPDATE_STORAGE_INFO'; payload: any };

const initialState: AppState = {
  playlists: [],
  tracks: [],
  downloadQueue: [],
  settings: DEFAULT_SETTINGS,
  auth: {
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null,
    userEmail: null,
    authMode: 'none',
  },
  currentPlayingTrack: null,
  storageInfo: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_PLAYLISTS':
      return { ...state, playlists: action.payload };
    case 'ADD_PLAYLIST':
      return { ...state, playlists: [...state.playlists, action.payload] };
    case 'UPDATE_PLAYLIST':
      return {
        ...state,
        playlists: state.playlists.map(p => (p.id === action.payload.id ? action.payload : p)),
      };
    case 'REMOVE_PLAYLIST':
      return {
        ...state,
        playlists: state.playlists.filter(p => p.id !== action.payload),
      };
    case 'SET_TRACKS':
      return { ...state, tracks: action.payload };
    case 'ADD_TRACKS':
      return { ...state, tracks: [...state.tracks, ...action.payload] };
    case 'UPDATE_TRACK':
      return {
        ...state,
        tracks: state.tracks.map(t => (t.id === action.payload.id ? action.payload : t)),
      };
    case 'REMOVE_TRACKS':
      return {
        ...state,
        tracks: state.tracks.filter(t => !action.payload.includes(t.id)),
      };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_AUTH':
      return { ...state, auth: action.payload };
    case 'SET_CURRENT_PLAYING_TRACK':
      return { ...state, currentPlayingTrack: action.payload };
    case 'ADD_TO_DOWNLOAD_QUEUE':
      return { ...state, downloadQueue: [...state.downloadQueue, action.payload] };
    case 'REMOVE_FROM_DOWNLOAD_QUEUE':
      return {
        ...state,
        downloadQueue: state.downloadQueue.filter(item => item.track.id !== action.payload),
      };
    case 'UPDATE_STORAGE_INFO':
      return { ...state, storageInfo: action.payload };
    default:
      return state;
  }
};

describe('AppContext Reducer', () => {
  const mockPlaylist: Playlist = {
    id: 'playlist-1',
    name: 'Test Playlist',
    url: 'https://youtube.com/playlist?list=PLtest',
    trackCount: 10,
    totalSize: 1000,
    lastSynced: null,
    dateAdded: new Date().toISOString(),
    syncStatus: 'idle',
  };

  const mockTrack: Track = {
    id: 'track-1',
    playlistId: 'playlist-1',
    title: 'Test Track',
    artist: 'Test Artist',
    duration: 180,
    fileSize: 0,
    filePath: null,
    downloadStatus: 'pending',
    downloadProgress: 0,
    youtubeId: 'yt123',
    position: 0,
  };

  describe('SET_PLAYLISTS', () => {
    it('should set playlists', () => {
      const newState = appReducer(initialState, {
        type: 'SET_PLAYLISTS',
        payload: [mockPlaylist],
      });

      expect(newState.playlists).toEqual([mockPlaylist]);
    });
  });

  describe('ADD_PLAYLIST', () => {
    it('should add a playlist', () => {
      const newState = appReducer(initialState, {
        type: 'ADD_PLAYLIST',
        payload: mockPlaylist,
      });

      expect(newState.playlists).toHaveLength(1);
      expect(newState.playlists[0]).toEqual(mockPlaylist);
    });
  });

  describe('UPDATE_PLAYLIST', () => {
    it('should update a playlist', () => {
      const stateWithPlaylist = appReducer(initialState, {
        type: 'ADD_PLAYLIST',
        payload: mockPlaylist,
      });

      const updatedPlaylist = { ...mockPlaylist, name: 'Updated Playlist' };
      const newState = appReducer(stateWithPlaylist, {
        type: 'UPDATE_PLAYLIST',
        payload: updatedPlaylist,
      });

      expect(newState.playlists[0].name).toBe('Updated Playlist');
    });

    it('should not update non-existent playlist', () => {
      const newState = appReducer(initialState, {
        type: 'UPDATE_PLAYLIST',
        payload: mockPlaylist,
      });

      expect(newState.playlists).toHaveLength(0);
    });
  });

  describe('REMOVE_PLAYLIST', () => {
    it('should remove a playlist', () => {
      const stateWithPlaylist = appReducer(initialState, {
        type: 'ADD_PLAYLIST',
        payload: mockPlaylist,
      });

      const newState = appReducer(stateWithPlaylist, {
        type: 'REMOVE_PLAYLIST',
        payload: 'playlist-1',
      });

      expect(newState.playlists).toHaveLength(0);
    });
  });

  describe('SET_TRACKS', () => {
    it('should set tracks', () => {
      const newState = appReducer(initialState, {
        type: 'SET_TRACKS',
        payload: [mockTrack],
      });

      expect(newState.tracks).toEqual([mockTrack]);
    });
  });

  describe('ADD_TRACKS', () => {
    it('should add tracks', () => {
      const newState = appReducer(initialState, {
        type: 'ADD_TRACKS',
        payload: [mockTrack],
      });

      expect(newState.tracks).toHaveLength(1);
    });

    it('should add multiple tracks', () => {
      const track2 = { ...mockTrack, id: 'track-2' };
      const newState = appReducer(initialState, {
        type: 'ADD_TRACKS',
        payload: [mockTrack, track2],
      });

      expect(newState.tracks).toHaveLength(2);
    });
  });

  describe('UPDATE_TRACK', () => {
    it('should update a track', () => {
      const stateWithTrack = appReducer(initialState, {
        type: 'ADD_TRACKS',
        payload: [mockTrack],
      });

      const updatedTrack = { ...mockTrack, downloadStatus: 'completed' as const };
      const newState = appReducer(stateWithTrack, {
        type: 'UPDATE_TRACK',
        payload: updatedTrack,
      });

      expect(newState.tracks[0].downloadStatus).toBe('completed');
    });
  });

  describe('REMOVE_TRACKS', () => {
    it('should remove tracks', () => {
      const stateWithTracks = appReducer(initialState, {
        type: 'ADD_TRACKS',
        payload: [mockTrack, { ...mockTrack, id: 'track-2' }],
      });

      const newState = appReducer(stateWithTracks, {
        type: 'REMOVE_TRACKS',
        payload: ['track-1'],
      });

      expect(newState.tracks).toHaveLength(1);
      expect(newState.tracks[0].id).toBe('track-2');
    });

    it('should remove multiple tracks', () => {
      const stateWithTracks = appReducer(initialState, {
        type: 'ADD_TRACKS',
        payload: [mockTrack, { ...mockTrack, id: 'track-2' }, { ...mockTrack, id: 'track-3' }],
      });

      const newState = appReducer(stateWithTracks, {
        type: 'REMOVE_TRACKS',
        payload: ['track-1', 'track-3'],
      });

      expect(newState.tracks).toHaveLength(1);
      expect(newState.tracks[0].id).toBe('track-2');
    });
  });

  describe('SET_SETTINGS', () => {
    it('should set settings', () => {
      const newSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        audioQuality: 320,
      };

      const newState = appReducer(initialState, {
        type: 'SET_SETTINGS',
        payload: newSettings,
      });

      expect(newState.settings.audioQuality).toBe(320);
    });
  });

  describe('SET_AUTH', () => {
    it('should set auth state', () => {
      const newAuth: AuthState = {
        isAuthenticated: true,
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        tokenExpiry: '2024-12-31T00:00:00Z',
        userEmail: 'test@example.com',
        authMode: 'oauth',
      };

      const newState = appReducer(initialState, {
        type: 'SET_AUTH',
        payload: newAuth,
      });

      expect(newState.auth.isAuthenticated).toBe(true);
      expect(newState.auth.accessToken).toBe('test-token');
    });
  });

  describe('SET_CURRENT_PLAYING_TRACK', () => {
    it('should set current playing track', () => {
      const newState = appReducer(initialState, {
        type: 'SET_CURRENT_PLAYING_TRACK',
        payload: mockTrack,
      });

      expect(newState.currentPlayingTrack).toEqual(mockTrack);
    });

    it('should clear current playing track', () => {
      const stateWithTrack = appReducer(initialState, {
        type: 'SET_CURRENT_PLAYING_TRACK',
        payload: mockTrack,
      });

      const newState = appReducer(stateWithTrack, {
        type: 'SET_CURRENT_PLAYING_TRACK',
        payload: null,
      });

      expect(newState.currentPlayingTrack).toBeNull();
    });
  });

  describe('ADD_TO_DOWNLOAD_QUEUE', () => {
    it('should add to download queue', () => {
      const queueItem = {
        track: mockTrack,
        playlist: mockPlaylist,
        priority: 1,
      };

      const newState = appReducer(initialState, {
        type: 'ADD_TO_DOWNLOAD_QUEUE',
        payload: queueItem,
      });

      expect(newState.downloadQueue).toHaveLength(1);
    });
  });

  describe('REMOVE_FROM_DOWNLOAD_QUEUE', () => {
    it('should remove from download queue', () => {
      const queueItem = {
        track: mockTrack,
        playlist: mockPlaylist,
        priority: 1,
      };

      const stateWithQueue = appReducer(initialState, {
        type: 'ADD_TO_DOWNLOAD_QUEUE',
        payload: queueItem,
      });

      const newState = appReducer(stateWithQueue, {
        type: 'REMOVE_FROM_DOWNLOAD_QUEUE',
        payload: 'track-1',
      });

      expect(newState.downloadQueue).toHaveLength(0);
    });
  });

  describe('UPDATE_STORAGE_INFO', () => {
    it('should update storage info', () => {
      const storageInfo = {
        totalSpace: 1000000,
        freeSpace: 500000,
        usedByApp: 100000,
      };

      const newState = appReducer(initialState, {
        type: 'UPDATE_STORAGE_INFO',
        payload: storageInfo,
      });

      expect(newState.storageInfo).toEqual(storageInfo);
    });
  });

  describe('default case', () => {
    it('should return state for unknown action', () => {
      // @ts-expect-error - testing unknown action type
      const newState = appReducer(initialState, { type: 'UNKNOWN_ACTION' });

      expect(newState).toEqual(initialState);
    });
  });
});
