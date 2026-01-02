import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Card, Text, ProgressBar, IconButton, useTheme } from 'react-native-paper';
import { Playlist } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatters';

interface PlaylistCardProps {
  playlist: Playlist;
  onPress: () => void;
  onSync?: () => void;
  onDelete?: () => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onPress, onSync, onDelete }) => {
  const theme = useTheme();

  const getSyncStatusColor = () => {
    switch (playlist.syncStatus) {
      case 'syncing':
      case 'downloading':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.tertiary;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  const getSyncStatusText = () => {
    switch (playlist.syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'downloading':
        return 'Downloading...';
      case 'completed':
        return 'Up to date';
      case 'error':
        return 'Sync failed';
      default:
        return 'Not synced';
    }
  };

  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        {playlist.thumbnailUrl && (
          <Image source={{ uri: playlist.thumbnailUrl }} style={styles.thumbnail} />
        )}
        <View style={styles.details}>
          <Text variant="titleMedium" numberOfLines={2}>
            {playlist.name}
          </Text>
          <Text variant="bodySmall" style={styles.trackCount}>
            {playlist.trackCount} tracks • {formatFileSize(playlist.totalSize)}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getSyncStatusColor() }]} />
            <Text variant="bodySmall" style={styles.statusText}>
              {getSyncStatusText()}
            </Text>
          </View>
          {playlist.lastSynced && (
            <Text variant="bodySmall" style={styles.lastSynced}>
              Last synced: {formatDate(playlist.lastSynced)}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          {onSync && (
            <IconButton
              icon="sync"
              size={20}
              onPress={e => {
                e.stopPropagation();
                onSync();
              }}
            />
          )}
          {onDelete && (
            <IconButton
              icon="delete"
              size={20}
              onPress={e => {
                e.stopPropagation();
                onDelete();
              }}
            />
          )}
        </View>
      </View>
      {(playlist.syncStatus === 'syncing' || playlist.syncStatus === 'downloading') && (
        <ProgressBar indeterminate color={theme.colors.primary} style={styles.progressBar} />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    padding: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  trackCount: {
    marginTop: 4,
    opacity: 0.7,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    opacity: 0.7,
  },
  lastSynced: {
    marginTop: 2,
    opacity: 0.5,
  },
  actions: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  progressBar: {
    height: 3,
  },
});

export default PlaylistCard;
