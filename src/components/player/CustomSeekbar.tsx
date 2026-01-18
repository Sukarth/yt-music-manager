import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface CustomSeekbarProps {
  value: number; // current position in seconds
  maximumValue: number; // duration in seconds
  onSeek: (value: number) => void;
  onSeekStart?: (value: number) => void;
  onSeekPreview?: (value: number) => void;
  onSeekEnd?: (value: number) => void;
  minimumTrackColor?: string;
  maximumTrackColor?: string;
  thumbColor?: string;
}

const THUMB_SIZE = 20;
const TRACK_HEIGHT = 4;

export const CustomSeekbar: React.FC<CustomSeekbarProps> = ({
  value,
  maximumValue,
  onSeek,
  onSeekStart,
  onSeekPreview,
  onSeekEnd,
  minimumTrackColor = '#6200ee',
  maximumTrackColor = '#e0e0e0',
  thumbColor = '#6200ee',
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const dragValueRef = useRef(value);
  const lastPreviewTimeRef = useRef(0);

  // Calculate position from value
  const safeDuration = maximumValue > 0 ? maximumValue : 1;
  const safeValue = isDragging ? dragValue : Math.max(0, Math.min(value, safeDuration));
  const progressRatio = safeValue / safeDuration;
  const thumbPosition = progressRatio * trackWidth - THUMB_SIZE / 2;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const _handleSeekComplete = useCallback(
    (ratio: number) => {
      const seekValue = ratio * safeDuration;
      onSeek(Math.max(0, Math.min(seekValue, safeDuration)));
    },
    [safeDuration, onSeek]
  );

  // Tap gesture for tap-to-seek
  const tapGesture = Gesture.Tap().onStart(event => {
    if (trackWidth > 0) {
      const ratio = Math.max(0, Math.min(event.x / trackWidth, 1));
      const nextValue = ratio * safeDuration;
      dragValueRef.current = nextValue;
      setDragValue(nextValue);
      onSeekPreview?.(nextValue);
      onSeekEnd?.(nextValue);
      onSeek(nextValue);
    }
  });

  // Pan gesture for drag-to-seek
  const panGesture = Gesture.Pan()
    .onStart(() => {
      setIsDragging(true);
      dragValueRef.current = Math.max(0, Math.min(value, safeDuration));
      setDragValue(dragValueRef.current);
      onSeekStart?.(dragValueRef.current);
    })
    .onUpdate(event => {
      if (trackWidth > 0) {
        const ratio = Math.max(0, Math.min(event.x / trackWidth, 1));
        const nextValue = ratio * safeDuration;
        dragValueRef.current = nextValue;
        setDragValue(nextValue);

        // Throttle preview updates to every 50ms for smooth performance
        const now = Date.now();
        if (onSeekPreview && now - lastPreviewTimeRef.current > 50) {
          lastPreviewTimeRef.current = now;
          onSeekPreview(nextValue);
        }
      }
    })
    .onEnd(() => {
      setIsDragging(false);
      const finalValue = Math.max(0, Math.min(dragValueRef.current, safeDuration));
      setDragValue(finalValue);
      onSeekEnd?.(finalValue);
      onSeek(finalValue);
    });

  // Combine gestures
  const composedGesture = Gesture.Race(panGesture, tapGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={styles.container} onLayout={handleLayout}>
        {/* Background Track */}
        <View style={[styles.track, { backgroundColor: maximumTrackColor }]}>
          {/* Progress Track */}
          <View
            style={[
              styles.progress,
              {
                backgroundColor: minimumTrackColor,
                width: `${progressRatio * 100}%`,
              },
            ]}
          />
        </View>
        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbColor,
              left: Math.max(0, Math.min(thumbPosition, trackWidth - THUMB_SIZE)),
            },
          ]}
        />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: THUMB_SIZE / 2,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
});

export default CustomSeekbar;
