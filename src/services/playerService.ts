import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioStatus } from 'expo-audio';
import { Alert } from 'react-native';
import { Track } from '../types';

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
    currentTrack: Track | null;
    isPlaying: boolean;
    isLoading: boolean;
    position: number;
    duration: number;
    repeatMode: RepeatMode;
    shuffleEnabled: boolean;
    queue: Track[];
    originalQueue: Track[];
    currentIndex: number;
}

type PlayerCallback = (state: PlayerState) => void;

class PlayerService {
    private sound: AudioPlayer | null = null;
    private state: PlayerState = {
        currentTrack: null,
        isPlaying: false,
        isLoading: false,
        position: 0,
        duration: 0,
        repeatMode: 'off',
        shuffleEnabled: false,
        queue: [],
        originalQueue: [],
        currentIndex: -1,
    };
    private listeners: Set<PlayerCallback> = new Set();
    private isInitialized = false;

    constructor() {
        this.initAudio();
    }

    private async initAudio() {
        if (this.isInitialized) return;
        try {
            await setAudioModeAsync({
                shouldPlayInBackground: true,
                playsInSilentMode: true,
                interruptionMode: 'doNotMix', // Required for lock screen controls
                shouldRouteThroughEarpiece: false,
            });
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize audio mode:', error);
        }
    }

    subscribe(callback: PlayerCallback): () => void {
        this.listeners.add(callback);
        callback(this.state);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners() {
        this.listeners.forEach(callback => callback({ ...this.state }));
    }

    private updateState(updates: Partial<PlayerState>) {
        this.state = { ...this.state, ...updates };
        this.notifyListeners();
    }

    getState(): PlayerState {
        return { ...this.state };
    }

    private setupLockScreenControls(track: Track) {
        if (!this.sound) return;
        
        try {
            this.sound.setActiveForLockScreen(true, {
                title: track.title,
                artist: track.artist || 'Unknown Artist',
                artworkUrl: track.thumbnailUrl || undefined,
            });
        } catch (error) {
            console.error('Failed to setup lock screen controls:', error);
        }
    }

    private updateLockScreenMetadata() {
        if (!this.sound || !this.state.currentTrack) return;
        
        try {
            this.sound.updateLockScreenMetadata({
                title: this.state.currentTrack.title,
                artist: this.state.currentTrack.artist || 'Unknown Artist',
                artworkUrl: this.state.currentTrack.thumbnailUrl || undefined,
            });
        } catch (error) {
            console.error('Failed to update lock screen metadata:', error);
        }
    }

    async loadTrack(track: Track, queue?: Track[], startIndex?: number) {
        if (!track.filePath) return;

        this.updateState({ isLoading: true });

        try {
            if (this.sound) {
                this.sound.remove();
                this.sound = null;
            }

            this.sound = createAudioPlayer({ uri: track.filePath });
            this.sound.addListener('playbackStatusUpdate', this.onPlaybackStatusUpdate);
            this.sound.play();

            const newQueue = queue || [track];
            const index = startIndex !== undefined ? startIndex : 0;

            this.updateState({
                currentTrack: track,
                isLoading: false,
                isPlaying: true,
                position: 0,
                duration: 0,
                queue: this.state.shuffleEnabled ? this.shuffleArray([...newQueue], index) : newQueue,
                originalQueue: newQueue,
                currentIndex: index,
            });

            // Setup lock screen controls after a short delay to ensure player is ready
            setTimeout(() => this.setupLockScreenControls(track), 100);
        } catch (error) {
            console.error('Error loading track:', error);
            this.updateState({ isLoading: false });
            Alert.alert(
                'Playback Error',
                'The requested song file was not found (it may have been deleted). Please try resyncing your playlist.',
                [{ text: 'OK' }]
            );
        }
    }

    private shuffleArray(array: Track[], currentIndex: number): Track[] {
        const currentTrack = array[currentIndex];
        const otherTracks = array.filter((_, i) => i !== currentIndex);

        for (let i = otherTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
        }

        return [currentTrack, ...otherTracks];
    }

    private onPlaybackStatusUpdate = (status: AudioStatus) => {
        if (!status.isLoaded) return;

        const wasPlaying = this.state.isPlaying;
        const isNowPlaying = status.playing;

        this.updateState({
            position: status.currentTime || 0,
            duration: status.duration || 0,
            isPlaying: isNowPlaying,
        });

        if (status.didJustFinish) {
            this.handleTrackFinished();
        }
    };

    private async handleTrackFinished() {
        const { repeatMode, currentIndex, queue } = this.state;

        if (repeatMode === 'one') {
            await this.seekTo(0);
            await this.play();
            return;
        }

        if (currentIndex < queue.length - 1) {
            await this.playNext();
        } else if (repeatMode === 'all') {
            await this.playTrackAtIndex(0);
        } else {
            this.updateState({ isPlaying: false });
        }
    }

    async play() {
        if (!this.sound) return;
        this.sound.play();
        this.updateState({ isPlaying: true });
    }

    async pause() {
        if (!this.sound) return;
        this.sound.pause();
        this.updateState({ isPlaying: false });
    }

    async togglePlayPause() {
        if (this.state.isPlaying) {
            await this.pause();
        } else {
            await this.play();
        }
    }

    async seekTo(seconds: number) {
        if (!this.sound) return;
        try {
            await this.sound.seekTo(seconds);
            this.updateState({ position: seconds });
        } catch (error) {
            console.error('Error seeking:', error);
        }
    }

    async playNext() {
        const { currentIndex, queue } = this.state;

        if (currentIndex < queue.length - 1) {
            await this.playTrackAtIndex(currentIndex + 1);
        } else if (this.state.repeatMode === 'all') {
            await this.playTrackAtIndex(0);
        }
    }

    async playPrevious() {
        const { currentIndex, position } = this.state;

        // If more than 3 seconds in, restart the song
        if (position > 3) {
            await this.seekTo(0);
            return;
        }

        if (currentIndex > 0) {
            await this.playTrackAtIndex(currentIndex - 1);
        }
    }

    async playTrackAtIndex(index: number) {
        const { queue } = this.state;
        if (index < 0 || index >= queue.length) return;

        const track = queue[index];
        if (!track.filePath) return;

        this.updateState({ isLoading: true, currentIndex: index });

        try {
            if (this.sound) {
                this.sound.remove();
                this.sound = null;
            }

            this.sound = createAudioPlayer({ uri: track.filePath });
            this.sound.addListener('playbackStatusUpdate', this.onPlaybackStatusUpdate);
            this.sound.play();

            this.updateState({
                currentTrack: track,
                isLoading: false,
                isPlaying: true,
                position: 0,
                duration: 0,
            });

            // Setup lock screen controls after a short delay to ensure player is ready
            setTimeout(() => this.setupLockScreenControls(track), 100);
        } catch (error) {
            console.error('Error loading track:', error);
            this.updateState({ isLoading: false });
            Alert.alert(
                'Playback Error',
                'The requested song file was not found (it may have been deleted). Please try resyncing your playlist.',
                [{ text: 'OK' }]
            );
        }
    }

    toggleRepeatMode() {
        const modes: RepeatMode[] = ['off', 'all', 'one'];
        const currentModeIndex = modes.indexOf(this.state.repeatMode);
        const nextMode = modes[(currentModeIndex + 1) % modes.length];
        this.updateState({ repeatMode: nextMode });
    }

    toggleShuffle() {
        const { shuffleEnabled, originalQueue, currentTrack, currentIndex } = this.state;

        if (!shuffleEnabled) {
            // Enable shuffle
            const shuffled = this.shuffleArray([...originalQueue], currentIndex);
            const newIndex = shuffled.findIndex(t => t.id === currentTrack?.id);
            this.updateState({
                shuffleEnabled: true,
                queue: shuffled,
                currentIndex: newIndex >= 0 ? newIndex : 0,
            });
        } else {
            // Disable shuffle - restore original order
            const newIndex = originalQueue.findIndex(t => t.id === currentTrack?.id);
            this.updateState({
                shuffleEnabled: false,
                queue: [...originalQueue],
                currentIndex: newIndex >= 0 ? newIndex : 0,
            });
        }
    }

    async stop() {
        if (this.sound) {
            this.sound.pause();
            try {
                this.sound.clearLockScreenControls();
            } catch (error) {
                console.error('Failed to clear lock screen controls:', error);
            }
            this.sound.remove();
            this.sound = null;
        }
        this.updateState({
            currentTrack: null,
            isPlaying: false,
            isLoading: false,
            position: 0,
            duration: 0,
            queue: [],
            originalQueue: [],
            currentIndex: -1,
        });
    }

    canPlayNext(): boolean {
        const { currentIndex, queue, repeatMode } = this.state;
        return currentIndex < queue.length - 1 || repeatMode === 'all';
    }

    canPlayPrevious(): boolean {
        const { currentIndex, position } = this.state;
        return currentIndex > 0 || position > 3;
    }

    moveQueueItem(fromIndex: number, toIndex: number) {
        const { queue, currentIndex } = this.state;
        const newQueue = [...queue];
        const [movedItem] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, movedItem);

        let newCurrentIndex = currentIndex;
        if (fromIndex === currentIndex) {
            newCurrentIndex = toIndex;
        } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
            newCurrentIndex = currentIndex - 1;
        } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
            newCurrentIndex = currentIndex + 1;
        }

        this.updateState({
            queue: newQueue,
            currentIndex: newCurrentIndex,
        });
    }

    removeFromQueue(index: number) {
        const { queue, currentIndex } = this.state;
        if (index === currentIndex) return; // Can't remove currently playing

        const newQueue = queue.filter((_, i) => i !== index);
        let newCurrentIndex = currentIndex;
        if (index < currentIndex) {
            newCurrentIndex = currentIndex - 1;
        }

        this.updateState({
            queue: newQueue,
            currentIndex: newCurrentIndex,
        });
    }
}

export const playerService = new PlayerService();
