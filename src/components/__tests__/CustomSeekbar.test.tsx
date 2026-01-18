import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import CustomSeekbar from '../player/CustomSeekbar';

jest.mock('react-native-gesture-handler', () => {
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Gesture: {
      Tap: () => ({
        onStart() {
          return this;
        },
      }),
      Pan: () => ({
        onStart() {
          return this;
        },
        onUpdate() {
          return this;
        },
        onEnd() {
          return this;
        },
      }),
      Race: jest.fn(() => ({})),
    },
  };
});

describe('CustomSeekbar', () => {
  it('should render and respond to layout', () => {
    const onSeek = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <CustomSeekbar value={10} maximumValue={100} onSeek={onSeek} />
    );

    const views = UNSAFE_getAllByType(View);
    const container = views[0];

    fireEvent(container, 'layout', { nativeEvent: { layout: { width: 200 } } });

    expect(container).toBeTruthy();
  });
});
