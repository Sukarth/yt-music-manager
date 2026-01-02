import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import {
  Text,
  FAB,
  Searchbar,
  Menu,
  IconButton,
  Portal,
  Dialog,
  Button,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../../store/AppContext';
import { usePlaylistManager } from '../../hooks/usePlaylistManager';
import { useDownloadManager } from '../../hooks/useDownloadManager';
import PlaylistCard from '../../components/playlist/PlaylistCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { RootStackParamList, Playlist } from '../../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { state } = useAppContext();
  const { removePlaylist, syncPlaylist } = usePlaylistManager();
  const { downloadPlaylist } = useDownloadManager();
  const theme = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'synced' | 'not-synced'>('all');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(false);

  const filteredPlaylists = state.playlists
    .filter(playlist => {
      if (!searchQuery) return true;
      return playlist.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .filter(playlist => {
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'synced') return playlist.lastSynced !== null;
      if (selectedFilter === 'not-synced') return playlist.lastSynced === null;
      return true;
    });

  const handleSyncPlaylist = async (playlist: Playlist) => {
    try {
      const preview = await syncPlaylist(playlist.id, true);
      if (preview.tracksToAdd.length > 0 || preview.tracksToRemove.length > 0) {
        Alert.alert(
          'Sync Preview',
          `${preview.tracksToAdd.length} tracks to add, ${preview.tracksToRemove.length} tracks to remove. Continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sync',
              onPress: async () => {
                await syncPlaylist(playlist.id, false);
                await downloadPlaylist(playlist.id);
              },
            },
          ]
        );
      } else {
        Alert.alert('Up to Date', 'This playlist is already up to date.');
      }
    } catch (error) {
      Alert.alert('Sync Error', 'Failed to sync playlist. Please try again.');
    }
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    setPlaylistToDelete(playlist);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!playlistToDelete) return;

    try {
      await removePlaylist(playlistToDelete.id, deleteFiles);
      setDeleteDialogVisible(false);
      setPlaylistToDelete(null);
      setDeleteFiles(false);
    } catch (error) {
      Alert.alert('Delete Error', 'Failed to delete playlist. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text variant="headlineMedium" style={styles.title}>
            My Playlists
          </Text>
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
              title="All Playlists"
              leadingIcon={selectedFilter === 'all' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => {
                setSelectedFilter('synced');
                setFilterMenuVisible(false);
              }}
              title="Synced"
              leadingIcon={selectedFilter === 'synced' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => {
                setSelectedFilter('not-synced');
                setFilterMenuVisible(false);
              }}
              title="Not Synced"
              leadingIcon={selectedFilter === 'not-synced' ? 'check' : undefined}
            />
          </Menu>
        </View>
        <Searchbar
          placeholder="Search playlists"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {filteredPlaylists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            {state.playlists.length === 0
              ? 'No playlists yet. Add your first playlist!'
              : 'No playlists match your search.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPlaylists}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PlaylistCard
              playlist={item}
              onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id })}
              onSync={() => handleSyncPlaylist(item)}
              onDelete={() => handleDeletePlaylist(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddPlaylist')}
      />

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Playlist</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete "{playlistToDelete?.name}"? This action cannot be
              undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteFiles(!deleteFiles)}>
              {deleteFiles ? 'Keep Files' : 'Delete Files'}
            </Button>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDelete}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  searchBar: {
    marginTop: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default HomeScreen;
