import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePlaylistManager } from '../../hooks/usePlaylistManager';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { RootStackParamList } from '../../types';
import { extractPlaylistId } from '../../utils/formatters';

type AddPlaylistScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddPlaylist'>;

interface AddPlaylistScreenProps {
  navigation: AddPlaylistScreenNavigationProp;
}

const AddPlaylistScreen: React.FC<AddPlaylistScreenProps> = ({ navigation }) => {
  const { addPlaylist, loading, error } = usePlaylistManager();
  const theme = useTheme();

  const [playlistUrl, setPlaylistUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateInput = (input: string): boolean => {
    if (!input.trim()) {
      setValidationError('Please enter a playlist URL or ID');
      return false;
    }

    const playlistId = extractPlaylistId(input);
    if (!playlistId) {
      setValidationError('Invalid playlist URL or ID');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleAddPlaylist = async () => {
    if (!validateInput(playlistUrl)) {
      return;
    }

    const result = await addPlaylist(playlistUrl);

    if (result) {
      Alert.alert('Success', `Playlist "${result.name}" added successfully!`, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Adding playlist..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="bodyLarge" style={styles.description}>
          Enter a YouTube playlist URL or ID to add it to your library.
        </Text>

        <TextInput
          label="Playlist URL or ID"
          value={playlistUrl}
          onChangeText={text => {
            setPlaylistUrl(text);
            setValidationError(null);
          }}
          mode="outlined"
          placeholder="https://www.youtube.com/playlist?list=..."
          style={styles.input}
          error={!!validationError || !!error}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {(validationError || error) && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {validationError || error}
          </Text>
        )}

        <View style={[styles.examplesContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="titleSmall" style={styles.examplesTitle}>
            Supported formats:
          </Text>
          <Text variant="bodySmall" style={styles.exampleText}>
            • Full URL: https://www.youtube.com/playlist?list=PLx...
          </Text>
          <Text variant="bodySmall" style={styles.exampleText}>
            • Playlist ID: PLx...
          </Text>
          <Text variant="bodySmall" style={styles.exampleText}>
            • Video with playlist: https://www.youtube.com/watch?v=...&list=PLx...
          </Text>
        </View>

        <Button
          mode="contained"
          onPress={handleAddPlaylist}
          style={styles.button}
          disabled={loading}>
          Add Playlist
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 16,
    fontSize: 12,
  },
  examplesContainer: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
  },
  examplesTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  exampleText: {
    marginTop: 4,
    opacity: 0.7,
  },
  button: {
    marginTop: 16,
  },
});

export default AddPlaylistScreen;
