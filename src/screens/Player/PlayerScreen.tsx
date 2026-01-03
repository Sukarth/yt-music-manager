import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, IconButton, ProgressBar, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../../store/AppContext';
import { RootStackParamList } from '../../types';
import { formatDuration } from '../../utils/formatters';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

interface PlayerScreenProps {
  route: PlayerScreenRouteProp;
  navigation: PlayerScreenNavigationProp;
}

const PlayerScreen: React.FC<PlayerScreenProps> = ({ route, navigation }) => {
  const { trackId } = route.params;
  const { state, dispatch } = useAppContext();
  const theme = useTheme();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const track = state.tracks.find(t => t.id === trackId);
  const playlistTracks = track
    ? state.tracks
        .filter(t => t.playlistId === track.playlistId && t.downloadStatus === 'completed')
        .sort((a, b) => a.position - b.position)
    : [];
  const currentIndex = playlistTracks.findIndex(t => t.id === trackId);

  useEffect(() => {
    loadAndPlayTrack();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [trackId]);

  useEffect(() => {
    if (track) {
      dispatch({ type: 'SET_CURRENT_PLAYING_TRACK', payload: track });
    }

    return () => {
      dispatch({ type: 'SET_CURRENT_PLAYING_TRACK', payload: null });
    };
  }, [track]);

  const loadAndPlayTrack = async () => {
    if (!track || !track.filePath) return;

    setIsLoading(true);

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.filePath },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsPlaying(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading track:', error);
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis / 1000);
      setDuration(status.durationMillis / 1000);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        handleNext();
      }
    }
  };

  const handlePlayPause = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleNext = () => {
    if (currentIndex < playlistTracks.length - 1) {
      const nextTrack = playlistTracks[currentIndex + 1];
      if (nextTrack) {
        navigation.setParams({ trackId: nextTrack.id });
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const previousTrack = playlistTracks[currentIndex - 1];
      if (previousTrack) {
        navigation.setParams({ trackId: previousTrack.id });
      }
    }
  };

  const _handleSeek = async (value: number) => {
    if (!sound) return;
    await sound.setPositionAsync(value * 1000);
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
        {track.thumbnailUrl && (
          <Image source={{ uri: track.thumbnailUrl }} style={styles.artwork} />
        )}

        <View style={styles.info}>
          <Text variant="headlineMedium" style={styles.title}>
            {track.title}
          </Text>
          <Text variant="titleMedium" style={styles.artist}>
            {track.artist}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <ProgressBar
            progress={duration > 0 ? position / duration : 0}
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          <View style={styles.timeContainer}>
            <Text variant="bodySmall">{formatDuration(position)}</Text>
            <Text variant="bodySmall">{formatDuration(duration)}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <IconButton
            icon="skip-previous"
            size={36}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          />
          <IconButton
            icon={isPlaying ? 'pause-circle' : 'play-circle'}
            size={64}
            onPress={handlePlayPause}
            disabled={isLoading}
          />
          <IconButton
            icon="skip-next"
            size={36}
            onPress={handleNext}
            disabled={currentIndex === playlistTracks.length - 1}
          />
        </View>

        <View style={styles.queueInfo}>
          <Text variant="bodyMedium">
            Track {currentIndex + 1} of {playlistTracks.length}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artwork: {
    width: 300,
    height: 300,
    borderRadius: 12,
    marginBottom: 32,
  },
  info: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  artist: {
    textAlign: 'center',
    opacity: 0.7,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  queueInfo: {
    alignItems: 'center',
  },
});

export default PlayerScreen;
