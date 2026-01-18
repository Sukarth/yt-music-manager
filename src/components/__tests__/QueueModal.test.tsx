import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import QueueModal from '../player/QueueModal';

const mockPlayTrackAtIndex = jest.fn();

jest.mock('../../hooks/usePlayer', () => ({
  usePlayer: () => ({
    queue: [
      {
        id: 'track-1',
        title: 'First Track',
        artist: 'Artist A',
        duration: 120,
        filePath: 'file:///a.mp3',
      },
      {
        id: 'track-2',
        title: 'Second Track',
        artist: 'Artist B',
        duration: 180,
        filePath: 'file:///b.mp3',
      },
    ],
    currentIndex: 0,
    currentTrack: {
      id: 'track-1',
      title: 'First Track',
      artist: 'Artist A',
      duration: 120,
      filePath: 'file:///a.mp3',
    },
    playTrackAtIndex: mockPlayTrackAtIndex,
  }),
}));

describe('QueueModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render queue items and header', () => {
    const { getByText } = render(
      <PaperProvider>
        <QueueModal visible={true} onDismiss={jest.fn()} />
      </PaperProvider>
    );

    expect(getByText('Queue')).toBeTruthy();
    expect(getByText(/First Track/)).toBeTruthy();
    expect(getByText('Second Track')).toBeTruthy();
  });

  it('should play selected track when pressed', () => {
    const { getByText } = render(
      <PaperProvider>
        <QueueModal visible={true} onDismiss={jest.fn()} />
      </PaperProvider>
    );

    fireEvent.press(getByText('Second Track'));

    expect(mockPlayTrackAtIndex).toHaveBeenCalledWith(1);
  });
});
