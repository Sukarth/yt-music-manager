import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import PlaylistCard from '../playlist/PlaylistCard';
import { Playlist } from '../../types';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<PaperProvider>{component}</PaperProvider>);
};

describe('PlaylistCard', () => {
  const mockPlaylist: Playlist = {
    id: 'playlist-1',
    name: 'Test Playlist',
    url: 'https://youtube.com/playlist?list=PLtest',
    trackCount: 10,
    totalSize: 1048576, // 1 MB
    lastSynced: new Date().toISOString(),
    dateAdded: new Date().toISOString(),
    syncStatus: 'idle',
    thumbnailUrl: 'https://example.com/thumb.jpg',
  };

  const mockOnPress = jest.fn();
  const mockOnSync = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render playlist name', () => {
    const { getByText } = renderWithProvider(
      <PlaylistCard playlist={mockPlaylist} onPress={mockOnPress} />
    );

    expect(getByText('Test Playlist')).toBeTruthy();
  });

  it('should render track count', () => {
    const { getByText } = renderWithProvider(
      <PlaylistCard playlist={mockPlaylist} onPress={mockOnPress} />
    );

    expect(getByText(/10 tracks/)).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const { getByText } = renderWithProvider(
      <PlaylistCard playlist={mockPlaylist} onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Test Playlist'));
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should show "Not synced" for idle status', () => {
    const { getByText } = renderWithProvider(
      <PlaylistCard playlist={mockPlaylist} onPress={mockOnPress} />
    );

    expect(getByText('Not synced')).toBeTruthy();
  });

  it('should show "Syncing..." for syncing status', () => {
    const syncingPlaylist = { ...mockPlaylist, syncStatus: 'syncing' as const };
    const { getByText } = renderWithProvider(
      <PlaylistCard playlist={syncingPlaylist} onPress={mockOnPress} />
    );

    expect(getByText('Syncing...')).toBeTruthy();
  });

  it('should show "Downloading..." for downloading status', () => {
    const downloadingPlaylist = { ...mockPlaylist, syncStatus: 'downloading' as const };
    const { getByText } = renderWithProvider(
      <PlaylistCard playlist={downloadingPlaylist} onPress={mockOnPress} />
    );

    expect(getByText('Downloading...')).toBeTruthy();
  });

  it('should show "Up to date" for completed status', () => {
    const completedPlaylist = { ...mockPlaylist, syncStatus: 'completed' as const };
    const { getByText } = renderWithProvider(
      <PlaylistCard playlist={completedPlaylist} onPress={mockOnPress} />
    );

    expect(getByText('Up to date')).toBeTruthy();
  });

  it('should show "Sync failed" for error status', () => {
    const errorPlaylist = { ...mockPlaylist, syncStatus: 'error' as const };
    const { getByText } = renderWithProvider(
      <PlaylistCard playlist={errorPlaylist} onPress={mockOnPress} />
    );

    expect(getByText('Sync failed')).toBeTruthy();
  });

  it('should show last synced date when available', () => {
    const { getByText } = renderWithProvider(
      <PlaylistCard playlist={mockPlaylist} onPress={mockOnPress} />
    );

    expect(getByText(/Last synced:/)).toBeTruthy();
  });

  it('should not show last synced when null', () => {
    const notSyncedPlaylist = { ...mockPlaylist, lastSynced: null };
    const { queryByText } = renderWithProvider(
      <PlaylistCard playlist={notSyncedPlaylist} onPress={mockOnPress} />
    );

    expect(queryByText(/Last synced:/)).toBeNull();
  });

  it('should render without crashing when onSync and onDelete are provided', () => {
    const { getByText } = renderWithProvider(
      <PlaylistCard
        playlist={mockPlaylist}
        onPress={mockOnPress}
        onSync={mockOnSync}
        onDelete={mockOnDelete}
      />
    );

    // The component should render and be interactive
    expect(getByText('Test Playlist')).toBeTruthy();
  });
});
