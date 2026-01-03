import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, List, Divider, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePlaylistManager } from '../../hooks/usePlaylistManager';
import { useDownloadManager } from '../../hooks/useDownloadManager';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { RootStackParamList, SyncPreview } from '../../types';
import { formatFileSize } from '../../utils/formatters';

type SyncPreviewScreenRouteProp = RouteProp<RootStackParamList, 'SyncPreview'>;
type SyncPreviewScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SyncPreview'>;

interface SyncPreviewScreenProps {
  route: SyncPreviewScreenRouteProp;
  navigation: SyncPreviewScreenNavigationProp;
}

const SyncPreviewScreen: React.FC<SyncPreviewScreenProps> = ({ route, navigation }) => {
  const { playlistId } = route.params;
  const { syncPlaylist } = usePlaylistManager();
  const { downloadPlaylist } = useDownloadManager();
  const theme = useTheme();

  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [playlistId]);

  const loadPreview = async () => {
    try {
      const result = await syncPlaylist(playlistId, true);
      setPreview(result);
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncPlaylist(playlistId, false);
      await downloadPlaylist(playlistId);
      navigation.goBack();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading sync preview..." />;
  }

  if (!preview) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text>Failed to load sync preview</Text>
      </SafeAreaView>
    );
  }

  const hasChanges = preview.tracksToAdd.length > 0 || preview.tracksToRemove.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall">Sync Preview</Text>
        <Text variant="bodyMedium" style={styles.summary}>
          {preview.tracksToAdd.length} tracks to add • {preview.tracksToRemove.length} tracks to
          remove
        </Text>
        {preview.totalDownloadSize > 0 && (
          <Text variant="bodySmall" style={styles.downloadSize}>
            Download size: {formatFileSize(preview.totalDownloadSize)}
          </Text>
        )}
      </View>

      <FlatList
        data={[
          { type: 'add', tracks: preview.tracksToAdd },
          { type: 'remove', tracks: preview.tracksToRemove },
        ]}
        keyExtractor={item => item.type}
        renderItem={({ item }) => (
          <View>
            {item.tracks.length > 0 && (
              <>
                <List.Subheader>
                  {item.type === 'add' ? 'Tracks to Add' : 'Tracks to Remove'}
                </List.Subheader>
                {item.tracks.map(track => (
                  <List.Item
                    key={track.id}
                    title={track.title}
                    description={track.artist}
                    left={props => (
                      <List.Icon
                        {...props}
                        icon={item.type === 'add' ? 'plus-circle' : 'minus-circle'}
                        color={item.type === 'add' ? theme.colors.tertiary : theme.colors.error}
                      />
                    )}
                  />
                ))}
                <Divider />
              </>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No changes to sync</Text>
          </View>
        }
      />

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
          disabled={syncing}>
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSync}
          style={styles.button}
          disabled={!hasChanges || syncing}
          loading={syncing}>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </View>
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
  summary: {
    marginTop: 8,
  },
  downloadSize: {
    marginTop: 4,
    opacity: 0.7,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
  },
});

export default SyncPreviewScreen;
