import TrackPlayer, {
    AppKilledPlaybackBehavior,
    Capability,
    Event,
    RepeatMode as TPRepeatMode,
    State,
    Track as TPTrack,
} from 'react-native-track-player';
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
    private listenersAttached = false;

    constructor() {
        this.ensureInitialized();
    }

    private async ensureInitialized() {
        if (this.isInitialized) return;
        try {
            await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
            await TrackPlayer.updateOptions({
                android: {
                    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
                },
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.SeekTo,
                ],
                compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious],
                progressUpdateEventInterval: 1,
            });
            this.attachEventListeners();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize player:', error);
        }
    }

    private attachEventListeners() {
        if (this.listenersAttached) return;
        this.listenersAttached = true;

        const playbackStateListener = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
            const isPlaying = event.state === State.Playing;
            const isLoading = event.state === State.Buffering || event.state === State.Loading;
            this.updateState({ isPlaying, isLoading });
        });

        const progressListener = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
            this.updateState({ position: event.position, duration: event.duration });
        });

        const trackChangedListener = TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (event) => {
            if (event.nextTrack === undefined || event.nextTrack === null) return;
            const index = event.nextTrack;
            const next = this.state.queue[index];
            if (next) {
                this.updateState({ currentIndex: index, currentTrack: next, position: 0 });
            }
        });
    }

    subscribe(callback: PlayerCallback): () => void {
        this.listeners.add(callback);
        callback(this.state);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners() {
        this.listeners.forEach((cb) => cb({ ...this.state }));
    }

    private updateState(updates: Partial<PlayerState>) {
        this.state = { ...this.state, ...updates };
        this.notifyListeners();
    }

    getState(): PlayerState {
        return { ...this.state };
    }

    private toTPTrack(track: Track): TPTrack {
        return {
            id: track.id,
            url: track.filePath || '',
            title: track.title,
            artist: track.artist,
            artwork: track.thumbnailUrl,
            duration: track.duration,
        };
    }

    private shuffleArray(array: Track[], currentIndex: number): Track[] {
        const currentTrack = array[currentIndex];
        const others = array.filter((_, i) => i !== currentIndex);
        for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
        }
        return [currentTrack, ...others];
    }

    private tpRepeat(mode: RepeatMode): TPRepeatMode {
        if (mode === 'one') return TPRepeatMode.Track;
        if (mode === 'all') return TPRepeatMode.Queue;
        return TPRepeatMode.Off;
    }

    async loadTrack(track: Track, queue?: Track[], startIndex?: number) {
        if (!track.filePath) return;
        await this.ensureInitialized();
        this.updateState({ isLoading: true });

        try {
            const baseQueue = queue || [track];
            const initialIndex = startIndex !== undefined ? startIndex : 0;
            const effectiveQueue = this.state.shuffleEnabled
                ? this.shuffleArray([...baseQueue], initialIndex)
                : baseQueue;
            const startId = track.id;
            const effectiveIndex = effectiveQueue.findIndex((t) => t.id === startId);
            const targetIndex = effectiveIndex >= 0 ? effectiveIndex : 0;

            await TrackPlayer.reset();
            await TrackPlayer.add(effectiveQueue.map((t) => this.toTPTrack(t)));
            await TrackPlayer.setRepeatMode(this.tpRepeat(this.state.repeatMode));
            await TrackPlayer.skip(targetIndex);
            await TrackPlayer.play();

            this.updateState({
                currentTrack: effectiveQueue[targetIndex],
                isLoading: false,
                isPlaying: true,
                position: 0,
                duration: effectiveQueue[targetIndex]?.duration || 0,
                queue: effectiveQueue,
                originalQueue: baseQueue,
                currentIndex: targetIndex,
            });
        } catch (error) {
            console.error('Error loading track:', error);
            this.updateState({ isLoading: false, isPlaying: false });
            Alert.alert(
                'Playback Error',
                'The requested song file was not found (it may have been deleted). Please try resyncing your playlist.',
                [{ text: 'OK' }]
            );
        }
    }

    async play() {
        await TrackPlayer.play();
        this.updateState({ isPlaying: true });
    }

    async pause() {
        await TrackPlayer.pause();
        this.updateState({ isPlaying: false });
    }

    async togglePlayPause() {
        const state = await TrackPlayer.getState();
        if (state === State.Playing) {
            await this.pause();
        } else {
            await this.play();
        }
    }

    async seekTo(seconds: number) {
        await TrackPlayer.seekTo(seconds);
        this.updateState({ position: seconds });
    }

    async playNext() {
        const { queue, currentIndex, currentTrack, repeatMode } = this.state;
        if (queue.length === 0) return;

        let nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
            if (repeatMode === 'all') {
                nextIndex = 0;
            } else {
                return; // End of queue
            }
        }

        const next = queue[nextIndex];
        if (!next) return;

        // Find track position in TrackPlayer's queue by ID
        const tpQueue = await TrackPlayer.getQueue();
        const tpIndex = tpQueue.findIndex((t) => t.id === next.id);
        if (tpIndex >= 0) {
            await TrackPlayer.skip(tpIndex);
            this.updateState({ currentIndex: nextIndex, currentTrack: next, position: 0 });
        }
    }

    async playPrevious() {
        const { queue, currentIndex, position } = this.state;
        if (queue.length === 0) return;

        // If more than 3 seconds in, restart current track
        if (position > 3) {
            await TrackPlayer.seekTo(0);
            this.updateState({ position: 0 });
            return;
        }

        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = 0;
            await TrackPlayer.seekTo(0);
            this.updateState({ position: 0 });
            return;
        }

        const prev = queue[prevIndex];
        if (!prev) return;

        const tpQueue = await TrackPlayer.getQueue();
        const tpIndex = tpQueue.findIndex((t) => t.id === prev.id);
        if (tpIndex >= 0) {
            await TrackPlayer.skip(tpIndex);
            this.updateState({ currentIndex: prevIndex, currentTrack: prev, position: 0 });
        }
    }

    async playTrackAtIndex(index: number) {
        if (index < 0 || index >= this.state.queue.length) return;
        await TrackPlayer.skip(index);
        await TrackPlayer.play();
        this.updateState({
            currentIndex: index,
            currentTrack: this.state.queue[index],
            isPlaying: true,
            position: 0,
        });
    }

    toggleRepeatMode() {
        const modes: RepeatMode[] = ['off', 'all', 'one'];
        const currentModeIndex = modes.indexOf(this.state.repeatMode);
        const nextMode = modes[(currentModeIndex + 1) % modes.length];
        TrackPlayer.setRepeatMode(this.tpRepeat(nextMode));
        this.updateState({ repeatMode: nextMode });
    }

    toggleShuffle() {
        const newShuffle = !this.state.shuffleEnabled;
        const current = this.state.currentTrack;
        const baseQueue = this.state.originalQueue.length ? this.state.originalQueue : this.state.queue;

        if (!current || baseQueue.length === 0) {
            this.updateState({ shuffleEnabled: newShuffle });
            return;
        }

        const currentBaseIndex = baseQueue.findIndex((t) => t.id === current.id);
        const effectiveQueue = newShuffle
            ? this.shuffleArray([...baseQueue], currentBaseIndex >= 0 ? currentBaseIndex : 0)
            : [...baseQueue];
        const newIndex = effectiveQueue.findIndex((t) => t.id === current.id);

        this.updateState({
            shuffleEnabled: newShuffle,
            queue: effectiveQueue,
            currentIndex: newIndex >= 0 ? newIndex : 0,
        });


        this.syncNativeQueue(effectiveQueue, current).catch(err =>
            console.error('Failed to sync native queue:', err)
        );
    }

    private async syncNativeQueue(newQueue: Track[], currentTrack: Track) {
        try {
            const queue = await TrackPlayer.getQueue();
            const currentNativeIndex = await TrackPlayer.getCurrentTrack();
            if (currentNativeIndex === null) return;

            const currentNativeTrack = queue[currentNativeIndex];
            if (currentNativeTrack.id !== currentTrack.id) {
                return;
            }

            const len = queue.length;
            const indicesToRemove = [];
            for (let i = 0; i < len; i++) {
                if (i !== currentNativeIndex) {
                    indicesToRemove.push(i);
                }
            }

            if (indicesToRemove.length > 0) {
                await TrackPlayer.remove(indicesToRemove);
            }

            const newIndex = newQueue.findIndex(t => t.id === currentTrack.id);
            const prevItems = newQueue.slice(0, newIndex);
            const nextItems = newQueue.slice(newIndex + 1);

            if (nextItems.length > 0) {
                await TrackPlayer.add(nextItems.map(t => this.toTPTrack(t)));
            }

            if (prevItems.length > 0) {
                await TrackPlayer.add(prevItems.map(t => this.toTPTrack(t)), 0);
            }
        } catch (e) {
            console.error('Error syncing native queue', e);
        }
    }

    async stop() {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
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
        return queue.length > 0 && (currentIndex < queue.length - 1 || repeatMode === 'all');
    }

    canPlayPrevious(): boolean {
        const { currentIndex, queue } = this.state;
        return queue.length > 0 && currentIndex > 0;
    }
}

export const playerService = new PlayerService();
