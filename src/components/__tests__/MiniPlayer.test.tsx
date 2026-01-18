import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import MiniPlayer from '../player/MiniPlayer';

const mockNavigate = jest.fn();
const mockTogglePlayPause = jest.fn();
const mockPlayNext = jest.fn();
const mockStop = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../hooks/usePlayer', () => ({
  usePlayer: () => ({
    currentTrack: {
      id: 'track-1',
      title: 'Track Title',
      artist: 'Artist Name',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      filePath: 'file:///test.mp3',
      duration: 120,
    },
    isPlaying: false,
    isLoading: false,
    progress: 0.4,
    togglePlayPause: mockTogglePlayPause,
    playNext: mockPlayNext,
    stop: mockStop,
  }),
}));

describe('MiniPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render current track info', () => {
    const { getByText } = render(
      <PaperProvider>
        <MiniPlayer />
      </PaperProvider>
    );

    expect(getByText('Track Title')).toBeTruthy();
    expect(getByText('Artist Name')).toBeTruthy();
  });

  it('should navigate to player on press', () => {
    const { getByText } = render(
      <PaperProvider>
        <MiniPlayer />
      </PaperProvider>
    );

    fireEvent.press(getByText('Track Title'));

    expect(mockNavigate).toHaveBeenCalledWith('Player', { trackId: 'track-1' });
  });

  it('should invoke control callbacks', () => {
    const { getAllByTestId } = render(
      <PaperProvider>
        <MiniPlayer />
      </PaperProvider>
    );

    const buttons = getAllByTestId('icon-button');

    const event = { stopPropagation: jest.fn() };

    fireEvent.press(buttons[0], event);
    fireEvent.press(buttons[1], event);
    fireEvent.press(buttons[2], event);

    expect(mockTogglePlayPause).toHaveBeenCalled();
    expect(mockPlayNext).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
  });
});
