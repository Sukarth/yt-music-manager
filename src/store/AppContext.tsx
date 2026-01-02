import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, Playlist, Track, AppSettings, AuthState, DownloadQueueItem } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import {
  loadPlaylists,
  savePlaylists,
  loadTracks,
  saveTracks,
  loadSettings,
  saveSettings,
  loadAuth,
  saveAuth,
} from '../utils/storage';
import * as FileSystem from 'expo-file-system';

const getDocumentDirectory = (): string => {
  return (FileSystem as any).documentDirectory || 'file:///';
};

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
  | { type: 'ADD_TO_DOWNLOAD_QUEUE'; payload: DownloadQueueItem }
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

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const loadInitialData = async () => {
      const [playlists, tracks, settings, auth] = await Promise.all([
        loadPlaylists(),
        loadTracks(),
        loadSettings(),
        loadAuth(),
      ]);

      if (playlists.length > 0) {
        dispatch({ type: 'SET_PLAYLISTS', payload: playlists });
      }

      if (tracks.length > 0) {
        dispatch({ type: 'SET_TRACKS', payload: tracks });
      }

      if (settings) {
        const downloadPath = settings.downloadPath || `${getDocumentDirectory()}YTMusicManager/`;
        dispatch({ type: 'SET_SETTINGS', payload: { ...settings, downloadPath } });
      } else {
        const downloadPath = `${getDocumentDirectory()}YTMusicManager/`;
        dispatch({ type: 'SET_SETTINGS', payload: { ...DEFAULT_SETTINGS, downloadPath } });
      }

      if (auth) {
        dispatch({ type: 'SET_AUTH', payload: auth });
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    savePlaylists(state.playlists);
  }, [state.playlists]);

  useEffect(() => {
    saveTracks(state.tracks);
  }, [state.tracks]);

  useEffect(() => {
    saveSettings(state.settings);
  }, [state.settings]);

  useEffect(() => {
    if (state.auth.isAuthenticated) {
      saveAuth(state.auth);
    }
  }, [state.auth]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
