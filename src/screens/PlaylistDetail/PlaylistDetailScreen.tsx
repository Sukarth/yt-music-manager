import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import {
  Text,
  Button,
  FAB,
  Searchbar,
  Menu,
  IconButton,
  ProgressBar,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAppContext } from '../../store/AppContext';
import { useDownloadManager } from '../../hooks/useDownloadManager';
import TrackItem from '../../components/playlist/TrackItem';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { RootStackParamList, Track } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatters';

type PlaylistDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PlaylistDetail'
>;

type PlaylistDetailScreenRouteProp = RouteProp<RootStackParamList, 'PlaylistDetail'>;

interface PlaylistDetailScreenProps {
  navigation: PlaylistDetailScreenNavigationProp;
  route: PlaylistDetailScreenRouteProp;
}

const PlaylistDetailScreen: React.FC<PlaylistDetailScreenProps> = ({ navigation, route }) => {
  const { playlistId } = route.params;
  const { state } = useAppContext();
  const { downloadTrack, downloadPlaylist, cancelDownload, activeDownloads } = useDownloadManager();
  const theme = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'downloaded' | 'pending'>('all');
  const [isDownloading, setIsDownloading] = useState(false);

  const playlist = state.playlists.find(p => p.id === playlistId);
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

  const handleDownloadAll = async () => {
    Alert.alert('Download All', 'Download all tracks in this playlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Download',
        onPress: async () => {
          setIsDownloading(true);
          try {
            await downloadPlaylist(playlistId);
            Alert.alert('Success', 'All tracks downloaded successfully!');
          } catch (error) {
            Alert.alert('Error', 'Failed to download some tracks.');
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
    } catch (error) {
      Alert.alert('Download Error', `Failed to download "${track.title}". Please try again.`);
    }
  };

  const handleCancelDownload = async (trackId: string) => {
    try {
      await cancelDownload(trackId);
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel download.');
    }
  };

  if (!playlist) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Playlist not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" numberOfLines={2}>
          {playlist.name}
        </Text>
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
          <Button
            mode="contained"
            onPress={handleDownloadAll}
            disabled={isDownloading}
            style={styles.downloadButton}>
            Download All
          </Button>
          <Menu
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <IconButton icon="filter-variant" onPress={() => setFilterMenuVisible(true)} />
            }>
            <Menu.Item
              onPress={() => {
                setSelectedFilter('all');
                setFilterMenuVisible(false);
              }}
              title="All Tracks"
              leadingIcon={selectedFilter === 'all' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => {
                setSelectedFilter('downloaded');
                setFilterMenuVisible(false);
              }}
              title="Downloaded"
              leadingIcon={selectedFilter === 'downloaded' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => {
                setSelectedFilter('pending');
                setFilterMenuVisible(false);
              }}
              title="Pending"
              leadingIcon={selectedFilter === 'pending' ? 'check' : undefined}
            />
          </Menu>
        </View>

        <Searchbar
          placeholder="Search tracks"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {isDownloading && (
        <View style={styles.downloadingContainer}>
          <ProgressBar indeterminate color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.downloadingText}>
            Downloading playlist...
          </Text>
        </View>
      )}

      <FlatList
        data={tracks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TrackItem
            track={item}
            onPress={() =>
              item.downloadStatus === 'completed' &&
              navigation.navigate('Player', { trackId: item.id })
            }
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
  downloadingContainer: {
    padding: 16,
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
