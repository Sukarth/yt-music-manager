import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { Audio } from 'expo-av';
import * as WebBrowser from 'expo-web-browser';
import { AppProvider } from './src/store/AppContext';
import RootNavigator from './src/navigation';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;

  useEffect(() => {
    // Complete any pending auth sessions
    WebBrowser.maybeCompleteAuthSession();

    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };

    setupAudio();
  }, []);

  return (
    <PaperProvider theme={theme}>
      <AppProvider>
        <RootNavigator />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </AppProvider>
    </PaperProvider>
  );
}
