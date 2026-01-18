import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import {
  Text,
  ProgressBar,
  IconButton,
  useTheme,
  TouchableRipple,
  Surface,
} from 'react-native-paper';
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

  const isDownloading = track.downloadStatus === 'downloading';
  const isCompleted = track.downloadStatus === 'completed';
  const isError = track.downloadStatus === 'error';

  const hasKnownTotalBytes = track.fileSize > 0;
  const hasValidProgress = Number.isFinite(track.downloadProgress) && track.downloadProgress >= 0;

  const getStatusIcon = () => {
    if (isCompleted) return 'check-circle';
    if (isDownloading) return 'stop-circle-outline';
    if (isError) return 'alert-circle-outline';
    return 'download-outline';
  };

  const getStatusColor = () => {
    if (isCompleted) return '#4CAF50';
    if (isDownloading) return theme.colors.primary;
    if (isError) return theme.colors.error;
    return theme.colors.onSurfaceVariant;
  };

  const handleActionPress = () => {
    if (isDownloading) {
      onCancel?.();
    } else if (isCompleted) {
      // No action for now
    } else {
      onDownload?.();
    }
  };

  return (
    <Surface style={styles.surface} elevation={0}>
      <TouchableRipple onPress={onPress} style={styles.touchable}>
        <View style={styles.container}>
          {/* Thumbnail Section */}
          <View style={styles.imageContainer}>
            {track.thumbnailUrl ? (
              <Image source={{ uri: track.thumbnailUrl }} style={styles.thumbnail} />
            ) : (
              <View
                style={[
                  styles.thumbnail,
                  styles.placeholder,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}>
                <Text variant="headlineSmall">🎵</Text>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.infoContainer}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
              {track.title}
            </Text>

            <View style={styles.detailsRow}>
              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={[styles.artist, { color: theme.colors.onSurfaceVariant }]}>
                {track.artist}
              </Text>
              <Text
                variant="bodySmall"
                style={[styles.duration, { color: theme.colors.onSurfaceDisabled }]}>
                • {formatDuration(track.duration || 0)}
              </Text>
            </View>

            {/* Progress Bar / Size Info */}
            <View style={styles.statusContainer}>
              {isDownloading ? (
                <View style={styles.progressWrapper}>
                  {hasKnownTotalBytes && hasValidProgress ? (
                    <>
                      <ProgressBar
                        progress={track.downloadProgress}
                        color={theme.colors.primary}
                        style={styles.progressBar}
                      />
                      <Text
                        variant="labelSmall"
                        style={{ color: theme.colors.primary, marginLeft: 8 }}>
                        {Math.round(track.downloadProgress * 100)}%
                      </Text>
                    </>
                  ) : (
                    <>
                      <ProgressBar
                        indeterminate
                        color={theme.colors.primary}
                        style={styles.progressBar}
                      />
                      <Text
                        variant="labelSmall"
                        style={{ color: theme.colors.primary, marginLeft: 8 }}>
                        Downloading...
                      </Text>
                    </>
                  )}
                </View>
              ) : isCompleted ? (
                track.fileSize > 0 && (
                  <Text variant="labelSmall" style={{ color: '#4CAF50' }}>
                    Downloaded ({formatFileSize(track.fileSize)})
                  </Text>
                )
              ) : isError ? (
                <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                  Download Failed
                </Text>
              ) : (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceDisabled }}>
                  Ready to download
                </Text>
              )}
            </View>
          </View>

          {/* Action Button Section */}
          <View style={styles.actionContainer}>
            <IconButton
              icon={getStatusIcon()}
              iconColor={getStatusColor()}
              size={24}
              onPress={handleActionPress}
              disabled={isCompleted}
            />
          </View>
        </View>
      </TouchableRipple>
    </Surface>
  );
};

const styles = StyleSheet.create({
  surface: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  touchable: {
    padding: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    marginRight: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontWeight: '600',
    marginBottom: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  artist: {
    maxWidth: '70%',
  },
  duration: {
    marginLeft: 4,
  },
  statusContainer: {
    height: 16,
    justifyContent: 'center',
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TrackItem;
