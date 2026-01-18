import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import {
  Text,
  Button,
  Searchbar,
  Menu,
  IconButton,
  ProgressBar,
  useTheme,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAppContext } from '../../store/AppContext';
import { usePlaylistManager } from '../../hooks/usePlaylistManager';
import { useDownloadManager } from '../../hooks/useDownloadManager';
import TrackItem from '../../components/playlist/TrackItem';
import { RootStackParamList, Track } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatters';

type PlaylistDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PlaylistDetail'
>;

type PlaylistDetailScreenRouteProp = RouteProp<RootStackParamList, 'PlaylistDetail'>;

type PlaylistDetailScreenProps = {
  navigation: PlaylistDetailScreenNavigationProp;
  route: PlaylistDetailScreenRouteProp;
};

const PlaylistDetailScreen: React.FC<PlaylistDetailScreenProps> = ({ navigation, route }) => {
  const { playlistId, autoDownload } = route.params;
  const { state } = useAppContext();
  // Added: usePlaylistManager to get removePlaylist functionality
  const { removePlaylist } = usePlaylistManager();

  const { downloadTrack, downloadPlaylist, syncPlaylist, cancelDownload } = useDownloadManager();
  const theme = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false); // New menu for options like delete
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'downloaded' | 'pending'>('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const playlist = state.playlists.find(p => p.id === playlistId);

  // Auto-download trigger
  React.useEffect(() => {
    if (autoDownload && playlist && !isDownloading) {
      handleSync();
      // Reset params so it doesn't loop if we go back and forth (though params usually persist)
      navigation.setParams({ autoDownload: undefined });
    }
  }, [autoDownload, playlist]);

  const tracks = state.tracks
    .filter(t => t.playlistId === playlistId)
    .filter(track => {
      if (!searchQuery) return true;
      return (
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .filter(track => {
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'downloaded') return track.downloadStatus === 'completed';
      if (selectedFilter === 'pending')
        return track.downloadStatus === 'pending' || track.downloadStatus === 'error';
      return true;
    })
    .sort((a, b) => a.position - b.position);

  const downloadedTracks = state.tracks.filter(
    t => t.playlistId === playlistId && t.downloadStatus === 'completed'
  );

  const totalSize = downloadedTracks.reduce((sum, track) => sum + track.fileSize, 0);

  const handleSync = async () => {
    setIsDownloading(true);
    setIsSyncing(true);
    try {
      const result = await syncPlaylist(playlistId);
      if (result.failed === 0) {
        Alert.alert('Sync Complete', `Successfully synced ${result.success} tracks!`);
      } else if (result.success === 0) {
        Alert.alert('Sync Error', `Failed to sync. ${result.failed} tracks failed.`);
      } else {
        Alert.alert(
          'Partially Complete',
          `Synced ${result.success} tracks.\n${result.failed} tracks failed.`
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to sync playlist.');
    } finally {
      setIsDownloading(false);
      setIsSyncing(false);
    }
  };

  const handleDownloadAll = async () => {
    Alert.alert('Download All', 'Download all tracks in this playlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Download',
        onPress: async () => {
          setIsDownloading(true);
          try {
            const result = await downloadPlaylist(playlistId);
            if (result.failed === 0) {
              Alert.alert('Success', `All ${result.success} tracks downloaded successfully!`);
            } else if (result.success === 0) {
              Alert.alert('Error', `Failed to download all ${result.failed} tracks.`);
            } else {
              Alert.alert(
                'Partially Complete',
                `Downloaded ${result.success} tracks.\n${result.failed} tracks failed to download.`
              );
            }
          } catch {
            Alert.alert('Error', 'Failed to download playlist.');
          } finally {
            setIsDownloading(false);
          }
        },
      },
    ]);
  };

  const handleDownloadTrack = async (track: Track) => {
    try {
      await downloadTrack(track);
    } catch {
      Alert.alert('Download Error', `Failed to download "${track.title}". Please try again.`);
    }
  };

  const handleCancelDownload = async (trackId: string) => {
    try {
      await cancelDownload(trackId);
    } catch {
      Alert.alert('Error', 'Failed to cancel download.');
    }
  };

  const handleRemovePlaylist = async () => {
    setOptionsMenuVisible(false);
    Alert.alert('Remove Playlist', 'Are you sure you want to remove this playlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Delete Files?',
            'Do you also want to delete the downloaded files for this playlist?',
            [
              {
                text: 'Keep Files',
                onPress: async () => {
                  await removePlaylist(playlistId, false);
                  navigation.goBack();
                },
              },
              {
                text: 'Delete Files',
                style: 'destructive',
                onPress: async () => {
                  await removePlaylist(playlistId, true);
                  navigation.goBack();
                },
              },
            ]
          );
        },
      },
    ]);
  };

  if (!playlist) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>Playlist not found</Text>
      </SafeAreaView>
    );
  }

  const isPlaylistDownloading =
    playlist?.syncStatus === 'downloading' || playlist?.syncStatus === 'syncing' || isDownloading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
          <Text variant="headlineSmall" numberOfLines={2} style={{ flex: 1, marginRight: 8 }}>
            {playlist.name}
          </Text>
          <Menu
            visible={optionsMenuVisible}
            onDismiss={() => setOptionsMenuVisible(false)}
            anchor={
              <IconButton icon="dots-vertical" onPress={() => setOptionsMenuVisible(true)} />
            }>
            <Menu.Item
              onPress={handleRemovePlaylist}
              title="Remove Playlist"
              leadingIcon="delete"
              titleStyle={{ color: theme.colors.error }}
            />
          </Menu>
        </View>
        {playlist.description && (
          <Text variant="bodySmall" numberOfLines={3} style={styles.description}>
            {playlist.description}
          </Text>
        )}
        <View style={styles.stats}>
          <Text variant="bodyMedium">
            {tracks.length} tracks • {downloadedTracks.length} downloaded
          </Text>
          <Text variant="bodySmall" style={styles.size}>
            Total size: {formatFileSize(totalSize)}
          </Text>
          {playlist.lastSynced && (
            <Text variant="bodySmall" style={styles.lastSynced}>
              Last synced: {formatDate(playlist.lastSynced)}
            </Text>
          )}
        </View>

        <View style={styles.actionsRow}>
          {playlist.syncStatus === 'completed' || downloadedTracks.length > 0 ? (
            <Button
              mode="contained"
              onPress={handleSync}
              disabled={isDownloading}
              style={styles.downloadButton}
              icon="sync">
              Sync Playlist
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleDownloadAll}
              disabled={isDownloading}
              style={styles.downloadButton}
              icon="download">
              Download All
            </Button>
          )}
        </View>

        {isPlaylistDownloading && (
          <View style={styles.downloadingContainer}>
            <ProgressBar indeterminate color={theme.colors.primary} style={styles.progressBar} />
            <Text variant="bodySmall" style={styles.downloadingText}>
              {isSyncing
                ? 'Syncing playlist...'
                : 'Downloading playlist. This will take some time.'}
            </Text>
          </View>
        )}

        <Searchbar
          placeholder="Search tracks"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <View style={styles.filterContainer}>
          <Chip
            selected={selectedFilter === 'all'}
            onPress={() => setSelectedFilter('all')}
            style={styles.filterChip}
            showSelectedOverlay>
            All
          </Chip>
          <Chip
            selected={selectedFilter === 'downloaded'}
            onPress={() => setSelectedFilter('downloaded')}
            style={styles.filterChip}
            showSelectedOverlay>
            Downloaded
          </Chip>
          <Chip
            selected={selectedFilter === 'pending'}
            onPress={() => setSelectedFilter('pending')}
            style={styles.filterChip}
            showSelectedOverlay>
            Pending
          </Chip>
        </View>
      </View>

      <FlatList
        data={tracks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TrackItem
            track={item}
            onPress={() => {
              if (item.downloadStatus === 'completed') {
                navigation.navigate('Player', { trackId: item.id });
              } else {
                Alert.alert('Not Downloaded', 'This track needs to be downloaded before playing.');
              }
            }}
            onDownload={() => handleDownloadTrack(item)}
            onCancel={() => handleCancelDownload(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tracks found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  description: {
    marginTop: 8,
    opacity: 0.7,
  },
  stats: {
    marginTop: 12,
  },
  size: {
    marginTop: 4,
    opacity: 0.7,
  },
  lastSynced: {
    marginTop: 4,
    opacity: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  downloadButton: {
    flex: 1,
  },
  searchBar: {
    marginTop: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  filterChip: {
    // flex: 1, // Optional: if you want them to share space equally
  },
  downloadingContainer: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  downloadingText: {
    marginTop: 8,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.6,
  },
});

export default PlaylistDetailScreen;
