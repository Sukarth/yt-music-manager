import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import {
  List,
  Switch,
  Button,
  Portal,
  Dialog,
  RadioButton,
  Divider,
  TextInput,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../../store/AppContext';
import { authService } from '../../services/authService';
import { AUDIO_QUALITY_OPTIONS, AUTO_SYNC_INTERVAL_OPTIONS } from '../../constants';
import { formatFileSize } from '../../utils/formatters';
import * as FileSystem from 'expo-file-system';

const getDocumentDirectory = (): string => {
  return (FileSystem as any).documentDirectory || 'file:///';
};

const SettingsScreen: React.FC = () => {
  const { state, dispatch } = useAppContext();

  const [qualityDialogVisible, setQualityDialogVisible] = useState(false);
  const [intervalDialogVisible, setIntervalDialogVisible] = useState(false);
  const [concurrentDialogVisible, setConcurrentDialogVisible] = useState(false);
  const [apiKeyDialogVisible, setApiKeyDialogVisible] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(state.settings.audioQuality);
  const [selectedInterval, setSelectedInterval] = useState(state.settings.autoSyncInterval);
  const [selectedConcurrent, setSelectedConcurrent] = useState(
    state.settings.maxConcurrentDownloads
  );
  const [apiKeyInput, setApiKeyInput] = useState(state.settings.youtubeApiKey || '');
  const [storageUsed, setStorageUsed] = useState<number | null>(null);

  React.useEffect(() => {
    calculateStorageUsage();
  }, []);

  const calculateStorageUsage = async () => {
    try {
      const basePath = `${getDocumentDirectory()}YTMusicManager/`;
      const dirInfo = await FileSystem.getInfoAsync(basePath);

      if (!dirInfo.exists) {
        setStorageUsed(0);
        return;
      }

      let totalSize = 0;
      const playlists = await FileSystem.readDirectoryAsync(basePath);

      for (const playlist of playlists) {
        const playlistPath = `${basePath}${playlist}`;
        const files = await FileSystem.readDirectoryAsync(playlistPath);

        for (const file of files) {
          const filePath = `${playlistPath}/${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists && !fileInfo.isDirectory) {
            totalSize += fileInfo.size || 0;
          }
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

  const handleClearCache = async () => {
    Alert.alert('Clear Cache', 'This will delete all downloaded music files. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            const basePath = `${getDocumentDirectory()}YTMusicManager/`;
            const dirInfo = await FileSystem.getInfoAsync(basePath);
            if (dirInfo.exists) {
              await FileSystem.deleteAsync(basePath, { idempotent: true });
            }
            setStorageUsed(0);
            Alert.alert('Success', 'Cache cleared successfully!');
          } catch {
            Alert.alert('Error', 'Failed to clear cache.');
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

  const saveApiKey = () => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: { ...state.settings, youtubeApiKey: apiKeyInput.trim() || null },
    });
    setApiKeyDialogVisible(false);
    Alert.alert('Success', 'YouTube API key saved successfully!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <List.Section>
          <List.Subheader>Authentication</List.Subheader>
          {state.auth.isAuthenticated ? (
            <>
              <List.Item
                title="Signed In"
                description={state.auth.userEmail || 'Google Account'}
                left={props => <List.Icon {...props} icon="account-check" />}
              />
              <List.Item
                title="Sign Out"
                left={props => <List.Icon {...props} icon="logout" />}
                onPress={handleSignOut}
              />
            </>
          ) : (
            <>
              <List.Item
                title="Not Signed In"
                description="Sign in to access private playlists"
                left={props => <List.Icon {...props} icon="account-alert" />}
              />
              <List.Item
                title="Sign In with Google"
                left={props => <List.Icon {...props} icon="google" />}
                onPress={handleSignIn}
              />
            </>
          )}
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>API Configuration</List.Subheader>
          <List.Item
            title="YouTube API Key"
            description={
              state.settings.youtubeApiKey
                ? `Configured: ${state.settings.youtubeApiKey.substring(0, 10)}...`
                : 'Not configured - Required for playlist fetching'
            }
            left={props => <List.Icon {...props} icon="key" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              setApiKeyInput(state.settings.youtubeApiKey || '');
              setApiKeyDialogVisible(true);
            }}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Download Settings</List.Subheader>
          <List.Item
            title="Audio Quality"
            description={`${state.settings.audioQuality} kbps`}
            left={props => <List.Icon {...props} icon="music-note" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              setSelectedQuality(state.settings.audioQuality);
              setQualityDialogVisible(true);
            }}
          />
          <List.Item
            title="Concurrent Downloads"
            description={`${state.settings.maxConcurrentDownloads} simultaneous downloads`}
            left={props => <List.Icon {...props} icon="download-multiple" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
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
            title="Clear Cache"
            description="Delete all downloaded files"
            left={props => <List.Icon {...props} icon="delete" />}
            onPress={handleClearCache}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>About</List.Subheader>
          <List.Item
            title="Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
          <List.Item
            title="YT Music Manager"
            description="Download and manage YouTube Music playlists"
            left={props => <List.Icon {...props} icon="music-box" />}
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

        <Dialog visible={apiKeyDialogVisible} onDismiss={() => setApiKeyDialogVisible(false)}>
          <Dialog.Title>YouTube API Key</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              To fetch playlists, you need a YouTube Data API v3 key. Get one from the Google Cloud
              Console.
            </Text>
            <TextInput
              label="API Key"
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              mode="outlined"
              placeholder="AIzaSy..."
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setApiKeyDialogVisible(false)}>Cancel</Button>
            <Button onPress={saveApiKey}>Save</Button>
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
