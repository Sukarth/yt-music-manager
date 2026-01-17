import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../store/AppContext';
import { STORAGE_KEYS } from '../constants';

export const useStoragePermission = () => {
    const { state, dispatch } = useAppContext();

    const checkAndSetupStorage = async (): Promise<boolean> => {
        // If not Android, or already custom with a path, we are good.
        if (Platform.OS !== 'android') return true;
        if (state.settings.storageLocationType === 'custom' && state.settings.downloadPath) return true;

        // MANDATORY: User MUST select a folder
        return new Promise<boolean>((resolve) => {
            Alert.alert(
                'Select Download Folder',
                'Please select a public folder (like "Music" or "Downloads"). A "YT Music Manager" folder will be created inside your chosen location to store all downloaded songs organized by playlist.',
                [
                    {
                        text: 'Select Folder',
                        onPress: async () => {
                            try {
                                const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                                if (permissions.granted) {
                                    const newSettings = {
                                        ...state.settings,
                                        storageLocationType: 'custom' as const,
                                        downloadPath: permissions.directoryUri,
                                    };

                                    // 1. Update Context
                                    dispatch({
                                        type: 'SET_SETTINGS',
                                        payload: newSettings,
                                    });

                                    // 2. Persist immediately so independent services can read it
                                    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));

                                    resolve(true);
                                } else {
                                    // User backed out - must select
                                    Alert.alert(
                                        'Folder Required',
                                        'You must select a folder to download songs. Please try again.',
                                        [{ text: 'OK', onPress: () => resolve(false) }]
                                    );
                                }
                            } catch (error) {
                                console.error('Error requesting storage permission:', error);
                                Alert.alert(
                                    'Error',
                                    'Could not open folder picker. Please try again.',
                                    [{ text: 'OK', onPress: () => resolve(false) }]
                                );
                            }
                        }
                    },
                ]
                ,
                { cancelable: false }
            );
        });

    };

    return { checkAndSetupStorage };
};
