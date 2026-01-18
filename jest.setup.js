jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(),
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(),
    setActiveForLockScreen: jest.fn(),
    updateLockScreenMetadata: jest.fn(),
    clearLockScreenControls: jest.fn(),
    playing: false,
    currentTime: 0,
    duration: 0,
    isLoaded: true,
  })),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///',
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  deleteAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(() => Promise.resolve({ uri: 'file:///test.mp3' })),
    pauseAsync: jest.fn(),
    resumeAsync: jest.fn(),
  })),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///',
  cacheDirectory: 'file:///',
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false, isDirectory: false, size: 0 })),
  deleteAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  StorageAccessFramework: {
    readDirectoryAsync: jest.fn(() => Promise.resolve([])),
    createFileAsync: jest.fn(() => Promise.resolve('content://file')),
    makeDirectoryAsync: jest.fn(() => Promise.resolve('content://folder')),
    deleteAsync: jest.fn(),
  },
  EncodingType: {
    Base64: 'base64',
  },
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(() => Promise.resolve({ uri: 'file:///test.mp3', status: 200 })),
    pauseAsync: jest.fn(),
    resumeAsync: jest.fn(),
  })),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const SafeAreaInsetsContext = React.createContext({ top: 0, bottom: 0, left: 0, right: 0 });

  return {
    SafeAreaInsetsContext,
    SafeAreaProvider: ({ children }) =>
      React.createElement(
        SafeAreaInsetsContext.Provider,
        { value: { top: 0, bottom: 0, left: 0, right: 0 } },
        children
      ),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock @expo/vector-icons to avoid expo-asset dependency
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const MockIcon = props => React.createElement('Icon', props);
  return new Proxy(
    {},
    {
      get: () => MockIcon,
    }
  );
});
