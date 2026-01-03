import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme as usePaperTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';

import HomeScreen from '../screens/Home/HomeScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import AddPlaylistScreen from '../screens/AddPlaylist/AddPlaylistScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetail/PlaylistDetailScreen';
import PlayerScreen from '../screens/Player/PlayerScreen';
import SyncPreviewScreen from '../screens/Sync/SyncPreviewScreen';

import { RootStackParamList, MainTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
  const theme = usePaperTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'musical-notes' : 'musical-notes-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.dark ? '#999' : '#666',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerShown: false,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'My Playlists' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const RootNavigator = () => {
  const colorScheme = useColorScheme();
  const paperTheme = usePaperTheme();

  // Create navigation theme that matches Paper theme
  const navigationTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: paperTheme.colors.primary,
      background: paperTheme.colors.background,
      card: paperTheme.colors.surface,
      text: paperTheme.colors.onSurface,
      border: paperTheme.colors.outline,
      notification: paperTheme.colors.error,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: paperTheme.colors.surface,
          },
          headerTintColor: paperTheme.colors.onSurface,
          contentStyle: {
            backgroundColor: paperTheme.colors.background,
          },
        }}>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="AddPlaylist"
          component={AddPlaylistScreen}
          options={{ title: 'Add Playlist' }}
        />
        <Stack.Screen
          name="PlaylistDetail"
          component={PlaylistDetailScreen}
          options={{ title: 'Playlist Details' }}
        />
        <Stack.Screen name="Player" component={PlayerScreen} options={{ title: 'Now Playing' }} />
        <Stack.Screen
          name="SyncPreview"
          component={SyncPreviewScreen}
          options={{ title: 'Sync Preview' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
