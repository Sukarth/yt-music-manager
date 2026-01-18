import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/Home/HomeScreen';
import MyPlaylistsScreen from '../screens/MyPlaylists/MyPlaylistsScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import AddPlaylistScreen from '../screens/AddPlaylist/AddPlaylistScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetail/PlaylistDetailScreen';
import PlayerScreen from '../screens/Player/PlayerScreen';
import SyncPreviewScreen from '../screens/Sync/SyncPreviewScreen';
import MiniPlayer from '../components/player/MiniPlayer';
import { usePlayer } from '../hooks/usePlayer';

import { RootStackParamList, MainTabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MINI_PLAYER_HEIGHT = 68;

const MainTabs = () => {
  const theme = useTheme();
  const { currentTrack } = usePlayer();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.tabsContainer}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'home';

            if (route.name === 'Home') {
              iconName = focused ? 'musical-notes' : 'musical-notes-outline';
            } else if (route.name === 'MyPlaylists') {
              iconName = focused ? 'cloud' : 'cloud-outline';
            } else if (route.name === 'Settings') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.surfaceVariant,
            height: 70 + (currentTrack ? MINI_PLAYER_HEIGHT : 0) + insets.bottom,
            paddingBottom: (currentTrack ? MINI_PLAYER_HEIGHT : 0) + 7 + insets.bottom,
            paddingTop: 9,
          },
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          headerShown: false,
        })}>
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'My Playlists' }} />
        <Tab.Screen
          name="MyPlaylists"
          component={MyPlaylistsScreen}
          options={{ title: 'Cloud Playlists' }}
        />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </View>
  );
};

// Component to conditionally show MiniPlayer - must be inside NavigationContainer
const NavigatorWithMiniPlayer: React.FC = () => {
  const theme = useTheme();
  const { currentTrack } = usePlayer();
  const [currentRouteName, setCurrentRouteName] = React.useState<string | undefined>();

  const isPlayerScreen = currentRouteName === 'Player';
  const showMiniPlayer = currentTrack && !isPlayerScreen;

  return (
    <View style={styles.container}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
        screenListeners={{
          state: e => {
            const getCurrentRouteName = (state: any): string | undefined => {
              if (!state) return undefined;
              const route = state.routes[state.index];
              if (route.state) {
                return getCurrentRouteName(route.state);
              }
              return route.name;
            };
            const routeName = getCurrentRouteName(e.data.state);
            setCurrentRouteName(routeName);
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
      {showMiniPlayer && <MiniPlayer />}
    </View>
  );
};

const RootNavigator = () => {
  const theme = useTheme();

  const navigationTheme = theme.dark
    ? {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.onSurface,
        border: theme.colors.surfaceVariant,
        notification: theme.colors.error,
      },
    }
    : {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.onSurface,
        border: theme.colors.surfaceVariant,
        notification: theme.colors.error,
      },
    };

  return (
    <NavigationContainer theme={navigationTheme}>
      <NavigatorWithMiniPlayer />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flex: 1,
  },
});

export default RootNavigator;
