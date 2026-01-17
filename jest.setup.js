jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(),
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(),
    playing: false,
    currentTime: 0,
    duration: 0,
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

// Mock @expo/vector-icons to avoid expo-asset dependency
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props) => React.createElement('Ionicons', props),
  };
});
