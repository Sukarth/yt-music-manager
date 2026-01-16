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
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppContext } from '../../store/AppContext';
import { authService } from '../../services/authService';
import { AUDIO_QUALITY_OPTIONS, AUTO_SYNC_INTERVAL_OPTIONS } from '../../constants';
import { formatFileSize } from '../../utils/formatters';

const getDocumentDirectory = (): string => {
  return FileSystem.documentDirectory || 'file:///';
};

const SettingsScreen: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const theme = useTheme();

  const [qualityDialogVisible, setQualityDialogVisible] = useState(false);
  const [intervalDialogVisible, setIntervalDialogVisible] = useState(false);
  const [concurrentDialogVisible, setConcurrentDialogVisible] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(state.settings.audioQuality);
  const [selectedInterval, setSelectedInterval] = useState(state.settings.autoSyncInterval);
  const [selectedConcurrent, setSelectedConcurrent] = useState(
    state.settings.maxConcurrentDownloads
  );
  const [storageUsed, setStorageUsed] = useState<number | null>(null);

  React.useEffect(() => {
    calculateStorageUsage();
  }, [state.tracks]); // Recalculate when tracks change

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
      // Calculate from state.tracks which has up-to-date fileSize info
      const totalSize = state.tracks
        .filter(t => t.downloadStatus === 'completed' && t.fileSize > 0)
        .reduce((sum, track) => sum + track.fileSize, 0);

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
    Alert.alert('Delete Downloaded Files', 'This will delete all downloaded music files. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const basePath = `${getDocumentDirectory()}YTMusicManager/`;
            const dirInfo = await FileSystem.getInfoAsync(basePath);
            if (dirInfo.exists) {
              await FileSystem.deleteAsync(basePath, { idempotent: true });
            }
            setStorageUsed(0);
            Alert.alert('Success', 'Downloaded files deleted successfully!');
          } catch {
            Alert.alert('Error', 'Failed to delete downloaded files.');
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
          <List.Subheader>Download Settings</List.Subheader>
          <List.Item
            title="Download Folder"
            description={
              state.settings.storageLocationType === 'custom'
                ? 'Custom folder (tap to change)'
                : 'App internal storage (private)'
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
          />
          <List.Item
            title="Author"
            description="Sukarth Acharya"
            left={props => <List.Icon {...props} icon="account" />}
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
