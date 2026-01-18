import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert, Linking, Platform } from 'react-native';
import {
  List,
  Switch,
  Button,
  Portal,
  Dialog,
  RadioButton,
  Divider,
  useTheme,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppContext } from '../../store/AppContext';
import { authService } from '../../services/authService';
import { AUDIO_QUALITY_OPTIONS, AUTO_SYNC_INTERVAL_OPTIONS, DEFAULT_BACKEND_URL } from '../../constants';
import { formatFileSize } from '../../utils/formatters';
import { loadDownloadIndex, clearDownloadIndex } from '../../utils/downloadIndex';
import { downloadService } from '../../services/downloadService';

const getDocumentDirectory = (): string => {
  return FileSystem.documentDirectory || 'file:///';
};

const SettingsScreen: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const theme = useTheme();

  const [qualityDialogVisible, setQualityDialogVisible] = useState(false);
  const [intervalDialogVisible, setIntervalDialogVisible] = useState(false);
  const [concurrentDialogVisible, setConcurrentDialogVisible] = useState(false);
  const [backendDialogVisible, setBackendDialogVisible] = useState(false);

  const [selectedQuality, setSelectedQuality] = useState(state.settings.audioQuality);
  const [selectedInterval, setSelectedInterval] = useState(state.settings.autoSyncInterval);
  const [selectedConcurrent, setSelectedConcurrent] = useState(
    state.settings.maxConcurrentDownloads
  );
  // Ensure we have a default if it's missing (migration safety)
  const currentBackendUrl = state.settings.backendUrl || DEFAULT_BACKEND_URL;
  const [tempBackendUrl, setTempBackendUrl] = useState(currentBackendUrl);

  const [storageUsed, setStorageUsed] = useState<number | null>(null);

  React.useEffect(() => {
    // Keep temp url in sync if it changes externally or on load
    setTempBackendUrl(state.settings.backendUrl || DEFAULT_BACKEND_URL);
  }, [state.settings.backendUrl]);

  React.useEffect(() => {
    calculateStorageUsage();
  }, [state.tracks, state.settings.storageLocationType, state.settings.downloadPath]); // Recalculate when tracks/folder changes

  const pickDownloadFolder = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Supported', 'Changing download folder is only supported on Android. On iOS, files are always in the Documents folder.');
      return;
    }

    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const uri = permissions.directoryUri;
        dispatch({
          type: 'SET_SETTINGS',
          payload: {
            ...state.settings,
            storageLocationType: 'custom',
            downloadPath: uri
          }
        });
        Alert.alert('Success', 'Download location updated! New downloads will be saved to the selected folder.');
      } else {
        // User cancelled
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to pick directory');
    }
  };

  const calculateStorageUsage = async () => {
    try {
      // SAF doesn't support file size enumeration with expo-file-system, so we keep a persistent index
      // that is updated on each successful download/delete.
      const index = await loadDownloadIndex();

      // Best-effort fallback: if some downloads aren't indexed yet, include sizes from current state.
      // (Avoid double-counting by only adding tracks whose filePath isn't already in the index.)
      let totalSize = 0;
      for (const [uri, entry] of Object.entries(index)) {
        totalSize += entry?.size || 0;
      }

      for (const track of state.tracks) {
        if (track.downloadStatus === 'completed' && track.filePath && !index[track.filePath]) {
          totalSize += track.fileSize || 0;
        }
      }

      setStorageUsed(totalSize);
    } catch (error) {
      console.error('Error calculating storage:', error);
      setStorageUsed(0);
    }
  };

  const handleSignIn = async () => {
    try {
      const auth = await authService.signInWithGoogle();
      dispatch({ type: 'SET_AUTH', payload: auth });
      Alert.alert('Success', 'Signed in successfully!');
    } catch {
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          await authService.signOut();
          dispatch({
            type: 'SET_AUTH',
            payload: authService.useNoAuth(),
          });
        },
      },
    ]);
  };

  const handleDeleteDownloadedFiles = async () => {
    Alert.alert('Delete All Storage', 'This will delete the entire YT Music Manager folder and all downloaded music. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Everything',
        style: 'destructive',
        onPress: async () => {
          try {
            const settingsStr = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@yt_music_manager_settings'));
            const settings = settingsStr ? JSON.parse(settingsStr) : null;
            const isCustom = settings?.storageLocationType === 'custom' && settings?.downloadPath;

            if (isCustom && Platform.OS === 'android') {
              // Delete entire YT Music Manager folder from SAF location
              const rootUri = settings.downloadPath;
              try {
                const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(rootUri);
                for (const childUri of children) {
                  const childName = decodeURIComponent(childUri.split('/').pop() || '');
                  if (childName === 'YT Music Manager') {
                    await FileSystem.StorageAccessFramework.deleteAsync(childUri, { idempotent: true });
                    break;
                  }
                }
              } catch (safErr) {
                console.error('SAF delete error:', safErr);
              }
            } else {
              // Delete entire internal YTMusicManager folder
              const basePath = `${getDocumentDirectory()}YTMusicManager/`;
              try {
                const dirInfo = await FileSystem.getInfoAsync(basePath);
                if (dirInfo.exists) {
                  await FileSystem.deleteAsync(basePath, { idempotent: true });
                }
              } catch (internalErr) {
                console.error('Internal delete error:', internalErr);
              }
            }

            // Clear download index
            await clearDownloadIndex();

            // Clear all track file paths from state
            state.tracks.forEach(track => {
              if (track.filePath) {
                dispatch({
                  type: 'UPDATE_TRACK',
                  payload: { ...track, filePath: '', downloadStatus: 'pending', downloadProgress: 0, fileSize: 0 }
                });
              }
            });

            setStorageUsed(0);
            Alert.alert('Success', 'All storage deleted successfully!');
          } catch (e) {
            console.error('Delete error:', e);
            Alert.alert('Error', 'Failed to delete storage.');
          }
        },
      },
    ]);
  };

  const saveQuality = () => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: { ...state.settings, audioQuality: selectedQuality },
    });
    setQualityDialogVisible(false);
  };

  const saveInterval = () => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: { ...state.settings, autoSyncInterval: selectedInterval },
    });
    setIntervalDialogVisible(false);
  };

  const saveConcurrent = () => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: { ...state.settings, maxConcurrentDownloads: selectedConcurrent },
    });
    setConcurrentDialogVisible(false);
  };

  const validateUrl = (url: string) => {
    try {
      // Basic check for http/https
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const saveBackendUrl = () => {
    const trimmed = tempBackendUrl.trim();

    if (!trimmed) {
      Alert.alert('Error', 'URL cannot be empty');
      return;
    }

    if (!validateUrl(trimmed)) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
      return;
    }

    // Remove trailing slash for consistency
    const cleanUrl = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;

    dispatch({
      type: 'SET_SETTINGS',
      payload: { ...state.settings, backendUrl: cleanUrl },
    });
    setBackendDialogVisible(false);
  };

  const resetBackendUrl = () => {
    setTempBackendUrl(DEFAULT_BACKEND_URL);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView>
        <List.Section>
          <List.Subheader>Authentication</List.Subheader>
          {state.auth.isAuthenticated ? (
            <>
              <List.Item
                title="Signed In"
                description={state.auth.userEmail || 'Google Account'}
                left={(props: any) => <List.Icon {...props} icon="account-check" />}
              />
              <List.Item
                title="Sign Out"
                left={(props: any) => <List.Icon {...props} icon="logout" />}
                onPress={handleSignOut}
              />
            </>
          ) : (
            <>
              <List.Item
                title="Not Signed In"
                description="Sign in to access private playlists"
                left={(props: any) => <List.Icon {...props} icon="account-alert" />}
              />
              <List.Item
                title="Sign In with Google"
                left={(props: any) => <List.Icon {...props} icon="google" />}
                onPress={handleSignIn}
              />
            </>
          )}
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Backend</List.Subheader>
          <List.Item
            title="Backend URL"
            description={state.settings.backendUrl || DEFAULT_BACKEND_URL}
            left={(props: any) => <List.Icon {...props} icon="server" />}
            right={(props: any) => <List.Icon {...props} icon="pencil" />}
            onPress={() => {
              setTempBackendUrl(state.settings.backendUrl || DEFAULT_BACKEND_URL);
              setBackendDialogVisible(true);
            }}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Download Settings</List.Subheader>
          <List.Item
            title="Download Folder"
            description={
              state.settings.storageLocationType === 'custom'
                ? 'Custom folder (tap to change)'
                : 'Unset'
            }
            left={(props: any) => <List.Icon {...props} icon="folder" />}
            right={(props: any) => <List.Icon {...props} icon="chevron-right" />}
            onPress={pickDownloadFolder}
          />
          <List.Item
            title="Audio Quality"
            description={`${state.settings.audioQuality} kbps`}
            left={(props: any) => <List.Icon {...props} icon="music-note" />}
            right={(props: any) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              setSelectedQuality(state.settings.audioQuality);
              setQualityDialogVisible(true);
            }}
          />
          <List.Item
            title="Concurrent Downloads"
            description={`${state.settings.maxConcurrentDownloads} simultaneous downloads`}
            left={(props: any) => <List.Icon {...props} icon="download-multiple" />}
            right={(props: any) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              setSelectedConcurrent(state.settings.maxConcurrentDownloads);
              setConcurrentDialogVisible(true);
            }}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Sync Settings</List.Subheader>
          <List.Item
            title="Auto-Sync"
            description="Automatically sync playlists in background"
            left={props => <List.Icon {...props} icon="sync" />}
            right={() => (
              <Switch
                value={state.settings.autoSyncEnabled}
                onValueChange={value =>
                  dispatch({
                    type: 'SET_SETTINGS',
                    payload: { ...state.settings, autoSyncEnabled: value },
                  })
                }
              />
            )}
          />
          <List.Item
            title="Sync Interval"
            description={`Every ${state.settings.autoSyncInterval} hour${state.settings.autoSyncInterval > 1 ? 's' : ''}`}
            left={props => <List.Icon {...props} icon="clock-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              setSelectedInterval(state.settings.autoSyncInterval);
              setIntervalDialogVisible(true);
            }}
            disabled={!state.settings.autoSyncEnabled}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Storage</List.Subheader>
          <List.Item
            title="Storage Used"
            description={storageUsed !== null ? formatFileSize(storageUsed) : 'Calculating...'}
            left={props => <List.Icon {...props} icon="database" />}
          />
          <List.Item
            title="Delete Downloaded Files"
            description="Remove all downloaded songs from storage"
            left={props => <List.Icon {...props} icon="delete" />}
            onPress={handleDeleteDownloadedFiles}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>About YT Music Manager</List.Subheader>
          <List.Item
            title="Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
            onPress={() => Linking.openURL('https://github.com/Sukarth/yt-music-manager/releases')}
          />
          <List.Item
            title="Author"
            description="Sukarth Acharya"
            left={props => <List.Icon {...props} icon="account" />}
            onPress={() => Linking.openURL('https://github.com/Sukarth')}
          />
          <List.Item
            title="View on GitHub"
            description="Open the project repository"
            left={props => <List.Icon {...props} icon="github" />}
            onPress={() => Linking.openURL('https://github.com/Sukarth/yt-music-manager')}
          />
        </List.Section>
      </ScrollView>

      <Portal>
        <Dialog visible={qualityDialogVisible} onDismiss={() => setQualityDialogVisible(false)}>
          <Dialog.Title>Audio Quality</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={value => setSelectedQuality(Number(value) as any)}
              value={selectedQuality.toString()}>
              {AUDIO_QUALITY_OPTIONS.map(option => (
                <RadioButton.Item
                  key={option.value}
                  label={option.label}
                  value={option.value.toString()}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setQualityDialogVisible(false)}>Cancel</Button>
            <Button onPress={saveQuality}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={intervalDialogVisible} onDismiss={() => setIntervalDialogVisible(false)}>
          <Dialog.Title>Auto-Sync Interval</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={value => setSelectedInterval(Number(value) as any)}
              value={selectedInterval.toString()}>
              {AUTO_SYNC_INTERVAL_OPTIONS.map(option => (
                <RadioButton.Item
                  key={option.value}
                  label={option.label}
                  value={option.value.toString()}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIntervalDialogVisible(false)}>Cancel</Button>
            <Button onPress={saveInterval}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={concurrentDialogVisible}
          onDismiss={() => setConcurrentDialogVisible(false)}>
          <Dialog.Title>Concurrent Downloads</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={value => setSelectedConcurrent(Number(value))}
              value={selectedConcurrent.toString()}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <RadioButton.Item
                  key={num}
                  label={`${num} download${num > 1 ? 's' : ''}`}
                  value={num.toString()}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConcurrentDialogVisible(false)}>Cancel</Button>
            <Button onPress={saveConcurrent}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={backendDialogVisible}
          onDismiss={() => setBackendDialogVisible(false)}>
          <Dialog.Title>Backend Server URL</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Server URL"
              value={tempBackendUrl}
              onChangeText={setTempBackendUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={resetBackendUrl} textColor={theme.colors.error}>Reset Default</Button>
            <Button onPress={() => setBackendDialogVisible(false)}>Cancel</Button>
            <Button onPress={saveBackendUrl}>Save</Button>
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
});

export default SettingsScreen;
