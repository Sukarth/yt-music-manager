import React from 'react';
import {
    View,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    Platform,
} from 'react-native';
import { Text, IconButton, ProgressBar, useTheme, Surface } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '../../hooks/usePlayer';
import { RootStackParamList } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MiniPlayer: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const {
        currentTrack,
        isPlaying,
        isLoading,
        progress,
        togglePlayPause,
        playNext,
        stop,
    } = usePlayer();

    if (!currentTrack) {
        return null;
    }

    const handlePress = () => {
        navigation.navigate('Player', { trackId: currentTrack.id });
    };

    return (
        <Surface
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.elevation.level2,
                    paddingBottom: insets.bottom,
                }
            ]}
            elevation={4}>
            <ProgressBar
                progress={progress}
                color={theme.colors.primary}
                style={styles.progressBar}
            />
            <TouchableOpacity
                style={styles.content}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <View style={styles.leftSection}>
                    {currentTrack.thumbnailUrl ? (
                        <Image
                            source={{ uri: currentTrack.thumbnailUrl }}
                            style={styles.artwork}
                        />
                    ) : (
                        <View style={[styles.artwork, styles.placeholderArtwork, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <IconButton icon="music-note" size={20} />
                        </View>
                    )}
                    <View style={styles.trackInfo}>
                        <Text
                            variant="bodyMedium"
                            numberOfLines={1}
                            style={[styles.title, { color: theme.colors.onSurface }]}
                        >
                            {currentTrack.title}
                        </Text>
                        <Text
                            variant="bodySmall"
                            numberOfLines={1}
                            style={[styles.artist, { color: theme.colors.onSurfaceVariant }]}
                        >
                            {currentTrack.artist}
                        </Text>
                    </View>
                </View>
                <View style={styles.controls}>
                    <IconButton
                        icon={isPlaying ? 'pause' : 'play'}
                        size={28}
                        onPress={(e) => {
                            e.stopPropagation?.();
                            togglePlayPause();
                        }}
                        disabled={isLoading}
                        iconColor={theme.colors.onSurface}
                    />
                    <IconButton
                        icon="skip-next"
                        size={24}
                        onPress={(e) => {
                            e.stopPropagation?.();
                            playNext();
                        }}
                        iconColor={theme.colors.onSurface}
                    />
                    <IconButton
                        icon="close"
                        size={20}
                        onPress={(e) => {
                            e.stopPropagation?.();
                            stop();
                        }}
                        iconColor={theme.colors.onSurfaceVariant}
                    />
                </View>
            </TouchableOpacity>
        </Surface>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: SCREEN_WIDTH,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: 2,
        borderRadius: 0,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    artwork: {
        width: 48,
        height: 48,
        borderRadius: 6,
    },
    placeholderArtwork: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackInfo: {
        marginLeft: 12,
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontWeight: '600',
    },
    artist: {
        marginTop: 2,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default MiniPlayer;
