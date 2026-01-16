import React from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Text, IconButton, useTheme, Surface, Modal, Portal } from 'react-native-paper';
import { usePlayer } from '../../hooks/usePlayer';
import { Track } from '../../types';
import { formatDuration } from '../../utils/formatters';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QueueModalProps {
    visible: boolean;
    onDismiss: () => void;
}

const QueueModal: React.FC<QueueModalProps> = ({ visible, onDismiss }) => {
    const theme = useTheme();
    const {
        queue,
        currentIndex,
        currentTrack,
        playTrackAtIndex,
    } = usePlayer();

    const renderQueueItem = ({ item, index }: { item: Track; index: number }) => {
        const isCurrentTrack = item.id === currentTrack?.id;
        const isUpNext = index > currentIndex;

        return (
            <TouchableOpacity
                style={[
                    styles.queueItem,
                    isCurrentTrack && { backgroundColor: theme.colors.primaryContainer },
                ]}
                onPress={() => playTrackAtIndex(index)}
                activeOpacity={0.7}
            >
                <View style={styles.queueItemLeft}>
                    {item.thumbnailUrl ? (
                        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
                    ) : (
                        <View
                            style={[
                                styles.thumbnail,
                                styles.placeholderThumbnail,
                                { backgroundColor: theme.colors.surfaceVariant },
                            ]}
                        >
                            <IconButton icon="music-note" size={16} />
                        </View>
                    )}
                    <View style={styles.queueItemInfo}>
                        <Text
                            variant="bodyMedium"
                            numberOfLines={1}
                            style={[
                                styles.queueItemTitle,
                                isCurrentTrack && { color: theme.colors.primary, fontWeight: '700' },
                            ]}
                        >
                            {isCurrentTrack && '♪ '}
                            {item.title}
                        </Text>
                        <Text
                            variant="bodySmall"
                            numberOfLines={1}
                            style={{ color: theme.colors.onSurfaceVariant }}
                        >
                            {item.artist}
                        </Text>
                    </View>
                </View>
                <View style={styles.queueItemRight}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatDuration(item.duration)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const upNextTracks = queue.slice(currentIndex + 1);
    const previousTracks = queue.slice(0, currentIndex);

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
                contentContainerStyle={[
                    styles.modalContainer,
                    { backgroundColor: theme.colors.surface },
                ]}
            >
                <View style={styles.header}>
                    <Text variant="titleLarge" style={{ fontWeight: '700' }}>
                        Queue
                    </Text>
                    <IconButton icon="close" size={24} onPress={onDismiss} />
                </View>

                <FlatList
                    data={queue}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={renderQueueItem}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={() => (
                        <View style={styles.sectionHeader}>
                            {currentTrack && (
                                <>
                                    <Text
                                        variant="labelLarge"
                                        style={[styles.sectionTitle, { color: theme.colors.primary }]}
                                    >
                                        Now Playing
                                    </Text>
                                    {previousTracks.length > 0 && (
                                        <Text
                                            variant="labelMedium"
                                            style={[styles.previousLabel, { color: theme.colors.onSurfaceVariant }]}
                                        >
                                            {previousTracks.length} played • {upNextTracks.length} up next
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>
                    )}
                    ItemSeparatorComponent={() => (
                        <View style={[styles.separator, { backgroundColor: theme.colors.surfaceVariant }]} />
                    )}
                />
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        margin: 20,
        marginTop: SCREEN_HEIGHT * 0.15,
        marginBottom: SCREEN_HEIGHT * 0.1,
        borderRadius: 16,
        padding: 16,
        maxHeight: SCREEN_HEIGHT * 0.75,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionHeader: {
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: 4,
    },
    previousLabel: {
        marginBottom: 8,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    queueItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    thumbnail: {
        width: 44,
        height: 44,
        borderRadius: 6,
    },
    placeholderThumbnail: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    queueItemInfo: {
        marginLeft: 12,
        flex: 1,
        marginRight: 8,
    },
    queueItemTitle: {
        marginBottom: 2,
    },
    queueItemRight: {
        alignItems: 'flex-end',
    },
    separator: {
        height: 1,
        marginHorizontal: 8,
    },
});

export default QueueModal;
