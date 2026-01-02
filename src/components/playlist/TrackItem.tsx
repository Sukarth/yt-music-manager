import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { List, Text, ProgressBar, IconButton, useTheme } from 'react-native-paper';
import { Track } from '../../types';
import { formatDuration, formatFileSize } from '../../utils/formatters';

interface TrackItemProps {
  track: Track;
  onPress?: () => void;
  onDownload?: () => void;
  onCancel?: () => void;
}

const TrackItem: React.FC<TrackItemProps> = ({ track, onPress, onDownload, onCancel }) => {
  const theme = useTheme();

  const getStatusIcon = () => {
    switch (track.downloadStatus) {
      case 'completed':
        return 'checkmark-circle';
      case 'downloading':
        return 'pause-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'download';
    }
  };

  const getStatusColor = () => {
    switch (track.downloadStatus) {
      case 'completed':
        return theme.colors.tertiary;
      case 'downloading':
        return theme.colors.primary;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  return (
    <View style={styles.container}>
      <List.Item
        title={track.title}
        description={`${track.artist} • ${formatDuration(track.duration)}`}
        onPress={onPress}
        left={props =>
          track.thumbnailUrl ? (
            <Image source={{ uri: track.thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <List.Icon {...props} icon="music-note" />
          )
        }
        right={props => (
          <View style={styles.rightContent}>
            {track.downloadStatus === 'completed' && track.fileSize > 0 && (
              <Text variant="bodySmall" style={styles.fileSize}>
                {formatFileSize(track.fileSize)}
              </Text>
            )}
            {track.downloadStatus === 'downloading' ? (
              <IconButton icon={getStatusIcon()} iconColor={getStatusColor()} onPress={onCancel} />
            ) : track.downloadStatus === 'pending' ? (
              <IconButton
                icon={getStatusIcon()}
                iconColor={getStatusColor()}
                onPress={onDownload}
              />
            ) : (
              <IconButton icon={getStatusIcon()} iconColor={getStatusColor()} />
            )}
          </View>
        )}
      />
      {track.downloadStatus === 'downloading' && (
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={track.downloadProgress}
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          <Text variant="bodySmall" style={styles.progressText}>
            {Math.round(track.downloadProgress * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginLeft: 8,
    alignSelf: 'center',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileSize: {
    marginRight: 8,
    opacity: 0.7,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    marginRight: 8,
  },
  progressText: {
    width: 40,
    textAlign: 'right',
  },
});

export default TrackItem;
