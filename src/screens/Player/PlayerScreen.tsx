import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Text, IconButton, useTheme, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../../store/AppContext';
import { usePlayer } from '../../hooks/usePlayer';
import { RootStackParamList } from '../../types';
import { formatDuration } from '../../utils/formatters';
import QueueModal from '../../components/player/QueueModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SEEKBAR_WIDTH = SCREEN_WIDTH - 48;

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

interface PlayerScreenProps {
  route: PlayerScreenRouteProp;
  navigation: PlayerScreenNavigationProp;
}

const PlayerScreen: React.FC<PlayerScreenProps> = ({ route, navigation }) => {
  const { trackId } = route.params;
  const { state } = useAppContext();
  const theme = useTheme();
  const [queueVisible, setQueueVisible] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const seekAnimValue = useRef(new Animated.Value(0)).current;

  const {
    currentTrack,
    isPlaying,
    isLoading,
    position,
    duration,
    repeatMode,
    shuffleEnabled,
    queue,
    currentIndex,
    loadTrack,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    toggleRepeatMode,
    toggleShuffle,
    canPlayNext,
    canPlayPrevious,
  } = usePlayer();

  const track = state.tracks.find(t => t.id === trackId);
  const playlistTracks = track
    ? state.tracks
      .filter(t => t.playlistId === track.playlistId && t.downloadStatus === 'completed')
      .sort((a, b) => a.position - b.position)
    : [];

  // Load track if not already playing
  useEffect(() => {
    if (track && (!currentTrack || currentTrack.id !== track.id)) {
      const startIndex = playlistTracks.findIndex(t => t.id === track.id);
      loadTrack(track, playlistTracks, startIndex >= 0 ? startIndex : 0);
    }
  }, [trackId]);

  // Update navigation params when track changes
  useEffect(() => {
    if (currentTrack && currentTrack.id !== trackId) {
      navigation.setParams({ trackId: currentTrack.id });
    }
  }, [currentTrack?.id]);

  // Seekbar pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSeeking(true);
        const x = evt.nativeEvent.locationX;
        const progress = Math.max(0, Math.min(1, x / SEEKBAR_WIDTH));
        setSeekPosition(progress * duration);
        seekAnimValue.setValue(progress);
      },
      onPanResponderMove: (evt, gestureState) => {
        const x = Math.max(0, Math.min(SEEKBAR_WIDTH, gestureState.moveX - 24));
        const progress = x / SEEKBAR_WIDTH;
        setSeekPosition(progress * duration);
        seekAnimValue.setValue(progress);
      },
      onPanResponderRelease: async () => {
        setIsSeeking(false);
        await seekTo(seekPosition);
      },
    })
  ).current;

  const displayPosition = isSeeking ? seekPosition : position;
  const progress = duration > 0 ? displayPosition / duration : 0;

  const getRepeatIcon = () => {
    switch (repeatMode) {
      case 'one':
        return 'repeat-once';
      case 'all':
        return 'repeat';
      default:
        return 'repeat-off';
    }
  };

  if (!track) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>Track not found</Text>
      </SafeAreaView>
    );
  }

  if (track.downloadStatus !== 'completed' || !track.filePath) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>Track not downloaded</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Artwork */}
        <View style={styles.artworkContainer}>
          {(currentTrack?.thumbnailUrl || track.thumbnailUrl) ? (
            <Image
              source={{ uri: currentTrack?.thumbnailUrl || track.thumbnailUrl }}
              style={styles.artwork}
            />
          ) : (
            <View
              style={[
                styles.artwork,
                styles.placeholderArtwork,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <IconButton icon="music-note" size={80} />
            </View>
          )}
        </View>

        {/* Track Info */}
        <View style={styles.info}>
          <Text variant="headlineSmall" style={styles.title} numberOfLines={2}>
            {currentTrack?.title || track.title}
          </Text>
          <Text variant="titleMedium" style={[styles.artist, { color: theme.colors.onSurfaceVariant }]}>
            {currentTrack?.artist || track.artist}
          </Text>
        </View>

        {/* Seekbar */}
        <View style={styles.seekbarContainer}>
          <View
            style={[styles.seekbarTrack, { backgroundColor: theme.colors.surfaceVariant }]}
            {...panResponder.panHandlers}
          >
            <View
              style={[
                styles.seekbarProgress,
                {
                  backgroundColor: theme.colors.primary,
                  width: `${progress * 100}%`,
                },
              ]}
            />
            <View
              style={[
                styles.seekbarThumb,
                {
                  backgroundColor: theme.colors.primary,
                  left: progress * SEEKBAR_WIDTH - 8,
                },
              ]}
            />
          </View>
          <View style={styles.timeContainer}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDuration(displayPosition)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDuration(duration)}
            </Text>
          </View>
        </View>

        {/* Main Controls */}
        <View style={styles.mainControls}>
          <IconButton
            icon={shuffleEnabled ? 'shuffle' : 'shuffle-disabled'}
            size={24}
            onPress={toggleShuffle}
            iconColor={shuffleEnabled ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
          <IconButton
            icon="skip-previous"
            size={40}
            onPress={playPrevious}
            disabled={!canPlayPrevious}
            iconColor={theme.colors.onSurface}
          />
          <Surface style={[styles.playButton, { backgroundColor: theme.colors.primary }]} elevation={4}>
            <IconButton
              icon={isPlaying ? 'pause' : 'play'}
              size={40}
              onPress={togglePlayPause}
              disabled={isLoading}
              iconColor={theme.colors.onPrimary}
            />
          </Surface>
          <IconButton
            icon="skip-next"
            size={40}
            onPress={playNext}
            disabled={!canPlayNext}
            iconColor={theme.colors.onSurface}
          />
          <IconButton
            icon={getRepeatIcon()}
            size={24}
            onPress={toggleRepeatMode}
            iconColor={repeatMode !== 'off' ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
        </View>

        {/* Secondary Controls */}
        <View style={styles.secondaryControls}>
          <TouchableOpacity
            style={styles.queueButton}
            onPress={() => setQueueVisible(true)}
          >
            <IconButton
              icon="playlist-music"
              size={24}
              iconColor={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Queue
            </Text>
          </TouchableOpacity>
        </View>

        {/* Queue Info */}
        <View style={styles.queueInfo}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {currentIndex + 1} of {queue.length} tracks
          </Text>
          {shuffleEnabled && (
            <Text variant="bodySmall" style={{ color: theme.colors.primary, marginLeft: 8 }}>
              • Shuffle On
            </Text>
          )}
          {repeatMode !== 'off' && (
            <Text variant="bodySmall" style={{ color: theme.colors.primary, marginLeft: 8 }}>
              • Repeat {repeatMode === 'one' ? 'One' : 'All'}
            </Text>
          )}
        </View>
      </View>

      <QueueModal visible={queueVisible} onDismiss={() => setQueueVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  artworkContainer: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  artwork: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH - 80,
    borderRadius: 12,
  },
  placeholderArtwork: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  artist: {
    textAlign: 'center',
  },
  seekbarContainer: {
    width: '100%',
    marginBottom: 24,
  },
  seekbarTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  seekbarProgress: {
    height: '100%',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  seekbarThumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
  },
  playButton: {
    borderRadius: 40,
    marginHorizontal: 16,
  },
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  queueButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PlayerScreen;
