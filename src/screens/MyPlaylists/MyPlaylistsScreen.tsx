import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, Platform } from 'react-native';
import {
  Text,
  ActivityIndicator,
  useTheme,
  Button,
  Card,
  Avatar,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import { RootStackParamList, MainTabParamList } from '../../types';
import { useAppContext } from '../../store/AppContext';
import { youtubeApi } from '../../services/youtubeApi';
import { usePlaylistManager } from '../../hooks/usePlaylistManager';
import { authService } from '../../services/authService';

type MyPlaylistsScreenProps = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'MyPlaylists'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

interface CloudPlaylist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  itemCount: number;
  privacy: string;
}

const MyPlaylistsScreen: React.FC<MyPlaylistsScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { state, dispatch } = useAppContext();
  const { addPlaylist } = usePlaylistManager(); // Hook for adding playlist
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playlists, setPlaylists] = useState<CloudPlaylist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null); // For loading state of specific playlist

  const openDownloadsFolder = async () => {
    try {
      if (Platform.OS === 'android') {
        // If we already have a SAF directory URI, try opening it. If not, prompt to pick one.
        const existingUri =
          state.settings.storageLocationType === 'custom' ? state.settings.downloadPath : null;

        let directoryUri: string | null = existingUri;
        if (!directoryUri) {
          const permissions =
            await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (!permissions.granted) {
            return;
          }
          directoryUri = permissions.directoryUri;
        }

        if (!existingUri) {
          dispatch({
            type: 'SET_SETTINGS',
            payload: {
              ...state.settings,
              storageLocationType: 'custom',
              downloadPath: directoryUri,
            },
          });
        }

        // Best-effort: ask Android to open the directory in a file manager.
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: directoryUri,
          flags: 1,
        });
      } else {
        // iOS
        Alert.alert(
          'iOS Files',
          'Open the Files app and go to “On My iPhone > YT Music Manager” to see your downloaded music.'
        );
      }
    } catch (e) {
      console.error('Failed to open folder:', e);
      Alert.alert('Error', 'Could not open folder');
    }
  };

  const fetchUserPlaylists = async (showRefreshing = false, retryToken?: string) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const token = retryToken || state.auth.accessToken;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const data = await youtubeApi.getUserPlaylists(token);
      setPlaylists(data);
    } catch (err: any) {
      console.error('Error fetching user playlists:', err);

      // AUTO-FIX: Try to refresh token if expired
      if (
        (err.message.includes('Invalid or expired token') || err.message.includes('401')) &&
        !retryToken
      ) {
        try {
          console.log('Token expired, attempting to refresh...');
          const newAuthState = await authService.refreshAccessToken('');
          if (newAuthState && newAuthState.accessToken) {
            console.log('Token refreshed successfully, retrying request...');
            dispatch({ type: 'SET_AUTH', payload: newAuthState });
            // Updates the token for future/concurrent requests in this scope if needed,
            // but mainly retry with the new token immediately
            await fetchUserPlaylists(showRefreshing, newAuthState.accessToken);
            return; // Exit successfully after retry
          }
        } catch (refreshErr) {
          console.error('Failed to refresh token:', refreshErr);
          // Continue to show error
        }
      }

      setError(err.message || 'Failed to load playlists');

      if (err.message.includes('Invalid or expired token')) {
        Alert.alert('Authentication Required', 'Your session has expired. Please sign in again.', [
          { text: 'OK' },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="folder-open"
          iconColor={theme.colors.primary}
          onPress={openDownloadsFolder}
        />
      ),
    });
  }, [
    navigation,
    theme.colors.primary,
    state.settings.storageLocationType,
    state.settings.downloadPath,
  ]);

  useEffect(() => {
    if (state.auth.authMode === 'oauth' && state.auth.accessToken) {
      fetchUserPlaylists();
    } else {
      setLoading(false);
      setError('Please sign in to view your playlists');
    }
  }, [state.auth.authMode, state.auth.accessToken]);

  const handlePlaylistPress = (playlist: CloudPlaylist) => {
    // Check if playlist already exists in local library
    const existingPlaylist = state.playlists.find(p => p.id === playlist.id);

    if (existingPlaylist) {
      // Already exists, just navigate
      navigation.navigate('PlaylistDetail', {
        playlistId: playlist.id,
      });
      return;
    }

    Alert.alert(
      playlist.title,
      `This playlist contains ${playlist.itemCount} tracks.\n\nAdd to library and download?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add & Download',
          onPress: async () => {
            try {
              setProcessingId(playlist.id);
              // Add playlist to local state using the manager
              // Note: playlist.id for YouTube playlists corresponds to the URL param
              const result = await addPlaylist(playlist.id);

              if (result) {
                // Navigate to Detail screen and trigger auto-download
                navigation.navigate('PlaylistDetail', {
                  playlistId: result.id,
                  autoDownload: true,
                });
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to add playlist');
              console.error(err);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const renderPlaylistItem = ({ item }: { item: CloudPlaylist }) => (
    <Card style={styles.playlistCard} onPress={() => handlePlaylistPress(item)} mode="elevated">
      <Card.Title
        title={item.title}
        titleVariant="titleMedium"
        subtitle={`${item.itemCount} tracks • ${item.privacy === 'private' ? '🔒 Private' : item.privacy === 'unlisted' ? '🔗 Unlisted' : '🌐 Public'}`}
        subtitleVariant="bodySmall"
        left={props =>
          processingId === item.id ? (
            <ActivityIndicator {...props} size="small" />
          ) : item.thumbnailUrl ? (
            <Avatar.Image {...props} source={{ uri: item.thumbnailUrl }} />
          ) : (
            <Avatar.Icon {...props} icon="playlist-music" />
          )
        }
      />
      {item.description ? (
        <Card.Content>
          <Text
            variant="bodySmall"
            numberOfLines={2}
            style={{ color: theme.colors.onSurfaceVariant }}>
            {item.description}
          </Text>
        </Card.Content>
      ) : null}
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            Cloud Playlists
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Browse and sync your YouTube playlists
          </Text>
        </View>
        <IconButton icon="folder-open" onPress={openDownloadsFolder} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top', 'left', 'right']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading your playlists...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.auth.authMode !== 'oauth') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top', 'left', 'right']}>
        <View style={styles.centerContent}>
          <Avatar.Icon size={64} icon="account-lock" style={{ marginBottom: 16 }} />
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            Sign In Required
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Please sign in with Google to view your YouTube playlists and sync them to your device.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Settings')}
            style={styles.signInButton}
            icon="google">
            Go to Settings
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !playlists.length) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top', 'left', 'right']}>
        <View style={styles.centerContent}>
          <Avatar.Icon
            size={64}
            icon="alert-circle"
            style={{ marginBottom: 16, backgroundColor: theme.colors.errorContainer }}
            color={theme.colors.error}
          />
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            Unable to Load Playlists
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {error}
          </Text>
          <Button
            mode="contained"
            onPress={() => fetchUserPlaylists()}
            style={styles.retryButton}
            icon="refresh">
            Try Again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}>
      <FlatList
        data={playlists}
        ListHeaderComponent={renderHeader}
        renderItem={renderPlaylistItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchUserPlaylists(true)}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={64} icon="playlist-remove" style={{ marginBottom: 16 }} />
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No Playlists Found
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              You don't have any YouTube playlists yet
            </Text>
            <Button
              mode="outlined"
              onPress={() => fetchUserPlaylists(true)}
              style={{ marginTop: 24 }}>
              Refresh
            </Button>
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
    paddingBottom: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    paddingRight: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  headerSubtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  playlistCard: {
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  signInButton: {
    marginTop: 24,
    width: '100%',
    maxWidth: 300,
  },
  retryButton: {
    marginTop: 24,
  },
});

export default MyPlaylistsScreen;
