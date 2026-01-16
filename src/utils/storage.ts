import AsyncStorage from '@react-native-async-storage/async-storage';
import { setItemAsync, getItemAsync, deleteItemAsync } from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';
import { Playlist, Track, AppSettings, AuthState } from '../types';

export const loadPlaylists = async (): Promise<Playlist[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading playlists:', error);
    return [];
  }
};

export const savePlaylists = async (playlists: Playlist[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  } catch (error) {
    console.error('Error saving playlists:', error);
    throw error;
  }
};

export const loadTracks = async (): Promise<Track[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TRACKS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading tracks:', error);
    return [];
  }
};

export const saveTracks = async (tracks: Track[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRACKS, JSON.stringify(tracks));
  } catch (error) {
    console.error('Error saving tracks:', error);
    throw error;
  }
};

export const loadSettings = async (): Promise<AppSettings | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const loadAuth = async (): Promise<AuthState | null> => {
  try {
    const accessToken = await getItemAsync('access_token');
    const refreshToken = await getItemAsync('refresh_token');
    const tokenExpiry = await getItemAsync('token_expiry');
    const userEmail = await getItemAsync('user_email');
    const authMode = await getItemAsync('auth_mode');

    if (!accessToken) return null;

    return {
      isAuthenticated: true,
      accessToken,
      refreshToken,
      tokenExpiry,
      userEmail,
      authMode: (authMode as 'oauth' | 'none') || 'none',
    };
  } catch (error) {
    console.error('Error loading auth:', error);
    return null;
  }
};

export const saveAuth = async (auth: AuthState): Promise<void> => {
  try {
    if (auth.accessToken) {
      await setItemAsync('access_token', auth.accessToken);
    }
    if (auth.refreshToken) {
      await setItemAsync('refresh_token', auth.refreshToken);
    }
    if (auth.tokenExpiry) {
      await setItemAsync('token_expiry', auth.tokenExpiry);
    }
    if (auth.userEmail) {
      await setItemAsync('user_email', auth.userEmail);
    }
    await setItemAsync('auth_mode', auth.authMode);
  } catch (error) {
    console.error('Error saving auth:', error);
    throw error;
  }
};

export const clearAuth = async (): Promise<void> => {
  try {
    await deleteItemAsync('access_token');
    await deleteItemAsync('refresh_token');
    await deleteItemAsync('token_expiry');
    await deleteItemAsync('user_email');
    await deleteItemAsync('auth_mode');
  } catch (error) {
    console.error('Error clearing auth:', error);
    throw error;
  }
};
