import TrackPlayer, { Event, State } from 'react-native-track-player';

// This function needs to be exported and registered in standard React Native (index.js)
// but for Expo with CNG/Prebuild, it still needs to be registered via TrackPlayer.registerPlaybackService

module.exports = async function () {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));
    TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
        // Handles interruptions like phone calls or navigation directions
        if (event.paused) {
            await TrackPlayer.pause();
        } else {
            await TrackPlayer.play();
        }
    });
};
