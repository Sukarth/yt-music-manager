import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import TrackItem from '../playlist/TrackItem';
import { Track } from '../../types';

const renderWithProvider = (component: React.ReactElement) => {
  return render(<PaperProvider>{component}</PaperProvider>);
};

describe('TrackItem', () => {
  const mockTrack: Track = {
    id: 'track-1',
    playlistId: 'playlist-1',
    title: 'Test Track',
    artist: 'Test Artist',
    duration: 180,
    fileSize: 5242880, // 5 MB
    filePath: 'file:///test.mp3',
    downloadStatus: 'completed',
    downloadProgress: 1,
    youtubeId: 'yt123',
    position: 0,
    thumbnailUrl: 'https://example.com/thumb.jpg',
  };

  const mockOnPress = jest.fn();
  const _mockOnDownload = jest.fn();
  const _mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render track title', () => {
    const { getByText } = renderWithProvider(<TrackItem track={mockTrack} />);

    expect(getByText('Test Track')).toBeTruthy();
  });

  it('should render artist and duration', () => {
    const { getByText } = renderWithProvider(<TrackItem track={mockTrack} />);

    expect(getByText(/Test Artist/)).toBeTruthy();
    expect(getByText(/3:00/)).toBeTruthy();
  });

  it('should show file size when completed', () => {
    const { getByText } = renderWithProvider(<TrackItem track={mockTrack} />);

    expect(getByText('5 MB')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const { getByText } = renderWithProvider(<TrackItem track={mockTrack} onPress={mockOnPress} />);

    fireEvent.press(getByText('Test Track'));
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should show progress bar when downloading', () => {
    const downloadingTrack = {
      ...mockTrack,
      downloadStatus: 'downloading' as const,
      downloadProgress: 0.5,
    };

    const { getByText } = renderWithProvider(<TrackItem track={downloadingTrack} />);

    expect(getByText('50%')).toBeTruthy();
  });

  it('should not show file size for pending tracks', () => {
    const pendingTrack = {
      ...mockTrack,
      downloadStatus: 'pending' as const,
      downloadProgress: 0,
      fileSize: 0,
    };

    const { queryByText } = renderWithProvider(<TrackItem track={pendingTrack} />);

    expect(queryByText('5 MB')).toBeNull();
  });

  it('should render without thumbnail', () => {
    const trackWithoutThumb = { ...mockTrack, thumbnailUrl: undefined };

    const { getByText } = renderWithProvider(<TrackItem track={trackWithoutThumb} />);

    expect(getByText('Test Track')).toBeTruthy();
  });
});
