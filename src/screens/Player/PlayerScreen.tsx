import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { Text, IconButton, useTheme, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollingText } from '../../components/common/ScrollingText';
import { CustomSeekbar } from '../../components/player/CustomSeekbar';
import { useAppContext } from '../../store/AppContext';
import { usePlayer } from '../../hooks/usePlayer';
import { RootStackParamList } from '../../types';
import { formatDuration } from '../../utils/formatters';
import QueueModal from '../../components/player/QueueModal';

const _screenWidth = Dimensions.get('window').width;

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

  // Safe values for seekbar
  const safePosition = Number.isFinite(position) ? position : 0;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 1;

  const [isSeeking, setIsSeeking] = useState(false);
  const [previewPosition, setPreviewPosition] = useState(0);
  const [pendingSeekTarget, setPendingSeekTarget] = useState<number | null>(null);
  const pendingSeekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending target once the player catches up (prevents thumb "teleport" flash).
  useEffect(() => {
    if (pendingSeekTarget == null) return;
    if (Math.abs(safePosition - pendingSeekTarget) < 0.35) {
      setPendingSeekTarget(null);
      if (pendingSeekTimeoutRef.current) {
        clearTimeout(pendingSeekTimeoutRef.current);
        pendingSeekTimeoutRef.current = null;
      }
    }
  }, [safePosition, pendingSeekTarget]);

  useEffect(() => {
    return () => {
      if (pendingSeekTimeoutRef.current) {
        clearTimeout(pendingSeekTimeoutRef.current);
      }
    };
  }, []);

  const displayedPosition = isSeeking ? previewPosition : (pendingSeekTarget ?? safePosition);

  const handleSeek = async (value: number) => {
    // if (__DEV__) console.log('[PlayerScreen] Seeking to:', value);
    await seekTo(value);
  };

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
          {currentTrack?.thumbnailUrl || track.thumbnailUrl ? (
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
              ]}>
              <IconButton icon="music-note" size={80} />
            </View>
          )}
        </View>

        {/* Track Info */}
        <View style={styles.info}>
          <ScrollingText
            text={currentTrack?.title || track.title}
            style={[styles.title, { color: theme.colors.onSurface }]}
            speed={50}
            delay={1000}
          />
          <Text
            variant="titleMedium"
            style={[styles.artist, { color: theme.colors.onSurfaceVariant }]}>
            {currentTrack?.artist || track.artist}
          </Text>
        </View>

        {/* Seekbar */}
        <View style={styles.seekbarContainer}>
          {isSeeking && (
            <Text
              variant="bodySmall"
              style={[styles.seekingLabel, { color: theme.colors.onSurfaceVariant }]}>
              Seeking to {formatDuration(previewPosition)}
            </Text>
          )}
          <CustomSeekbar
            value={displayedPosition}
            maximumValue={safeDuration}
            onSeek={handleSeek}
            onSeekStart={value => {
              setIsSeeking(true);
              setPreviewPosition(value);
            }}
            onSeekPreview={value => {
              setPreviewPosition(value);
            }}
            onSeekEnd={value => {
              setIsSeeking(false);
              setPreviewPosition(value);
              setPendingSeekTarget(value);

              if (pendingSeekTimeoutRef.current) {
                clearTimeout(pendingSeekTimeoutRef.current);
              }
              // Fallback: clear after a short delay even if the progress event is slow.
              pendingSeekTimeoutRef.current = setTimeout(() => {
                setPendingSeekTarget(null);
                pendingSeekTimeoutRef.current = null;
              }, 1500);
            }}
            minimumTrackColor={theme.colors.primary}
            maximumTrackColor={theme.colors.surfaceVariant}
            thumbColor={theme.colors.primary}
          />
          <View style={styles.timeContainer}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDuration(safePosition)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDuration(safeDuration)}
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
          <Surface
            style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
            elevation={4}>
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
          <TouchableOpacity style={styles.queueButton} onPress={() => setQueueVisible(true)}>
            <IconButton icon="playlist-music" size={24} iconColor={theme.colors.onSurfaceVariant} />
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
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
  },
  artworkContainer: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    width: '100%',
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  placeholderArtwork: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 12,
  },
  seekingLabel: {
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
