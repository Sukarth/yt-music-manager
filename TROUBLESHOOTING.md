# Troubleshooting Guide - YT Music Manager

This guide helps you resolve common issues when developing or using YT Music Manager.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Build Issues](#build-issues)
- [Runtime Issues](#runtime-issues)
- [Authentication Issues](#authentication-issues)
- [Download Issues](#download-issues)
- [Playback Issues](#playback-issues)
- [Storage Issues](#storage-issues)
- [Performance Issues](#performance-issues)

## Installation Issues

### npm install fails

**Error**: Dependencies not installing

```bash
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution**:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps
npm install --legacy-peer-deps
```

### Expo CLI not found

**Error**: `expo: command not found`

**Solution**:

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Or use npx
npx expo start
```

## Build Issues

### Android Build Fails

**Error**: Gradle build failure

```
Task :app:bundleReleaseJsAndAssets FAILED
```

**Solution 1**: Clear Gradle cache

```bash
cd android
./gradlew clean
cd ..
```

**Solution 2**: Clear Metro bundler cache

```bash
expo start -c
```

**Solution 3**: Check Java version

```bash
# Ensure Java 11 or 17 is installed
java -version
```

### iOS Build Fails

**Error**: Pod install failure

```
[!] CocoaPods could not find compatible versions
```

**Solution 1**: Update CocoaPods

```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Solution 2**: Clear derived data

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### EAS Build Fails

**Error**: Build fails on EAS servers

**Solution 1**: Check eas.json configuration

```json
{
  "build": {
    "production": {
      "node": "18.x",
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

**Solution 2**: Clear EAS cache

```bash
eas build --platform android --clear-cache
```

## Runtime Issues

### App Crashes on Startup

**Issue**: App crashes immediately after launch

**Debug Steps**:

1. Check error logs:

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

2. Verify all dependencies are installed:

```bash
npm install
```

3. Clear Metro cache:

```bash
expo start -c
```

4. Check for syntax errors:

```bash
npm run typecheck
npm run lint
```

### White Screen / Blank Screen

**Issue**: App shows white/blank screen

**Solutions**:

1. Check for JavaScript errors in console
2. Verify App.tsx is properly exported
3. Check navigation configuration
4. Clear cache and restart

### Network Request Failures

**Error**: API requests timeout or fail

**Solutions**:

1. Check network connectivity
2. Verify API URLs are correct
3. Check for CORS issues (web only)
4. Enable network debugging:

```typescript
// In App.tsx
if (__DEV__) {
  global.XMLHttpRequest = global.originalXMLHttpRequest || global.XMLHttpRequest;
}
```

### Playlist Fetch Fails - "Failed to fetch playlist information"

**Error**: When adding a valid YouTube playlist URL, the app shows "Failed to fetch playlist information"

**Causes**:
1. **Backend service is sleeping** - The backend on Render (free tier) goes to sleep after 15 minutes of inactivity
2. **Backend not running** - The backend service may be down
3. **Network issues** - Unable to reach the backend server

**Solutions**:

1. **Wake up the backend**: Visit the backend URL directly in a browser first:
   ```
   https://yt-music-manager-backend.onrender.com/health
   ```
   Wait 30-60 seconds for the cold start to complete, then retry in the app.

2. **Check backend status**: The backend at `https://yt-music-manager-backend.onrender.com` must be running and have the following endpoints:
   - `GET /api/playlist-info?playlistId={id}` - Returns playlist metadata
   - `GET /api/playlist-videos?playlistId={id}` - Returns list of videos

3. **Self-host the backend**: See `BACKEND_ALTERNATIVES.md` for alternative hosting options that don't have cold start issues.

4. **Set up ping service**: Use a free service like [UptimeRobot](https://uptimerobot.com) to ping your backend every 14 minutes to prevent sleeping.

## Authentication Issues

### Google Sign-In Fails with "Access blocked: Authorization Error"

**Error**: 
```
Error 400: invalid_request
Request details: redirect_uri=ytmusicmanager://
```

This error occurs when the redirect URI is not properly configured in Google Cloud Console.

**Solution - Configure Google Cloud Console**:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under "Authorized redirect URIs", add the following:
   - `ytmusicmanager://` (for production builds)
   - `exp://localhost:19000` (for development with Expo Go)
   - `exp://192.168.x.x:19000` (replace with your local IP for device testing)
6. Click **Save**

**Important Notes**:
- Changes may take a few minutes to propagate
- For Android standalone builds, you need an **Android** type OAuth client
- The Client ID in the app must match the one in Google Cloud Console
- Make sure the YouTube Data API v3 is enabled in your project

### Google Sign-In Fails

**Error**: OAuth flow doesn't complete

**Solutions**:

1. Verify Google Client ID is correct in `src/services/authService.ts`
2. Check redirect URIs in Google Console (see above)
3. Enable YouTube Data API v3 in Google Cloud Console
4. Clear app data and retry

### Token Expired

**Issue**: "Token expired" errors

**Solution**:

```typescript
// Implement token refresh
if (auth.tokenExpiry < Date.now()) {
  const newAuth = await authService.refreshAccessToken(auth.refreshToken);
  dispatch({ type: 'SET_AUTH', payload: newAuth });
}
```

### SecureStore Issues

**Error**: Cannot save/retrieve tokens

**Solutions**:

1. Check device supports SecureStore
2. Verify app has keychain access (iOS)
3. Clear and re-authenticate
4. Fallback to AsyncStorage for testing

## Download Issues

### Downloads Fail

**Issue**: Tracks fail to download

**Debug Steps**:

1. Check network connectivity
2. Verify download URLs are valid
3. Check storage permissions (Android)
4. Monitor file system errors:

```typescript
try {
  await downloadTrack(track);
} catch (error) {
  console.error('Download error:', error);
}
```

### Downloads Stuck

**Issue**: Downloads never complete

**Solutions**:

1. Check concurrent download limit
2. Verify no memory leaks
3. Cancel and retry download
4. Clear download queue

### File Not Found After Download

**Issue**: Downloaded file cannot be played

**Solutions**:

1. Verify file path is correct
2. Check file actually exists:

```typescript
const fileInfo = await FileSystem.getInfoAsync(filePath);
if (!fileInfo.exists) {
  console.error('File not found:', filePath);
}
```

3. Check file permissions
4. Verify download completed successfully

## Playback Issues

### Audio Won't Play

**Issue**: Track doesn't play or no sound

**Solutions**:

1. Check audio file exists
2. Verify audio permissions
3. Check device volume
4. Enable audio mode:

```typescript
await Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
});
```

### Playback Stutters

**Issue**: Audio playback is choppy

**Solutions**:

1. Close other apps
2. Check file quality/size
3. Optimize buffer settings
4. Reduce concurrent downloads during playback

### Background Playback Fails

**Issue**: Audio stops when app is backgrounded

**iOS Solutions**:

1. Verify Background Modes capability
2. Check Info.plist:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

**Android Solutions**:

1. Check foreground service permission
2. Implement media session

## Storage Issues

### Out of Storage

**Issue**: "Insufficient storage" errors

**Solutions**:

1. Check available storage:

```typescript
const info = await FileSystem.getFreeDiskStorageAsync();
console.log('Free space:', info);
```

2. Implement storage cleanup
3. Delete unused playlists
4. Reduce audio quality

### Cannot Access Files

**Issue**: Permission denied errors

**Android Solutions**:

1. Request storage permission:

```typescript
import * as Permissions from 'expo-permissions';

const { status } = await Permissions.askAsync(Permissions.MEDIA_LIBRARY);
```

2. Check AndroidManifest.xml permissions
3. Use scoped storage (Android 10+)

### Storage Calculation Wrong

**Issue**: Storage usage shows incorrect values

**Solution**:

```typescript
// Recalculate storage
const calculateStorage = async () => {
  let total = 0;
  for (const playlist of playlists) {
    const size = await getPlaylistSize(playlist.id);
    total += size;
  }
  return total;
};
```

## Performance Issues

### Slow App Launch

**Issue**: App takes long to start

**Solutions**:

1. Optimize initial data loading
2. Implement lazy loading
3. Reduce bundle size
4. Profile startup performance

### Slow Scrolling

**Issue**: List scrolling is laggy

**Solutions**:

1. Use FlatList optimization:

```typescript
<FlatList
  data={items}
  windowSize={10}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  removeClippedSubviews={true}
/>
```

2. Implement React.memo for list items
3. Optimize image loading
4. Reduce component complexity

### High Memory Usage

**Issue**: App uses too much memory

**Solutions**:

1. Profile memory usage:

```bash
# iOS
xcrun xctrace record --device <device-id> --template 'Memory'

# Android
adb shell dumpsys meminfo com.ytmusicmanager.app
```

2. Fix memory leaks
3. Optimize image caching
4. Clear unused data

### Battery Drain

**Issue**: App drains battery quickly

**Solutions**:

1. Optimize background tasks
2. Reduce polling frequency
3. Implement efficient sync
4. Use battery profiling tools

## Testing Issues

### Tests Fail

**Issue**: Jest tests failing

**Solutions**:

1. Update test mocks:

```javascript
// jest.setup.js
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
  },
}));
```

2. Clear Jest cache:

```bash
jest --clearCache
npm test
```

3. Check test environment
4. Update snapshots if needed:

```bash
npm test -- -u
```

### Coverage Below Threshold

**Issue**: Test coverage < 70%

**Solutions**:

1. Identify uncovered code:

```bash
npm run test:coverage -- --verbose
```

2. Add missing tests
3. Remove untested code
4. Adjust threshold if needed

## Platform-Specific Issues

### iOS Issues

**Face ID/Touch ID Fails**:

```typescript
// Add to Info.plist
<key>NSFaceIDUsageDescription</key>
<string>Enable Face ID for secure authentication</string>
```

**App Store Rejection**:

- Add privacy policy URL
- Provide demo account
- Fix UI issues
- Remove unused permissions

### Android Issues

**Back Button Doesn't Work**:

```typescript
import { BackHandler } from 'react-native';

useEffect(() => {
  const backAction = () => {
    // Handle back action
    return true;
  };

  BackHandler.addEventListener('hardwareBackPress', backAction);
  return () => BackHandler.removeEventListener('hardwareBackPress', backAction);
}, []);
```

**Notification Channel Required**:

```typescript
// Create notification channel for Android 8.0+
await Notifications.setNotificationChannelAsync('default', {
  name: 'Default',
  importance: Notifications.AndroidImportance.DEFAULT,
});
```

## Debug Tools

### Enable Remote Debugging

**iOS**: Cmd+D → "Debug"
**Android**: Cmd+M → "Debug"

### React Native Debugger

```bash
# Install
brew install --cask react-native-debugger

# Run
open "rndebugger://set-debugger-loc?host=localhost&port=19000"
```

### Network Debugging

```bash
# Use React Native Debugger
# Or Charles Proxy
# Or Proxyman (macOS)
```

### Performance Profiling

```typescript
import { Systrace } from 'react-native';

// Start profiling
Systrace.beginEvent('ExpensiveOperation');

// Your code here

// End profiling
Systrace.endEvent();
```

## Getting Help

### Before Asking for Help

1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Check Expo documentation
4. Search Stack Overflow

### Creating an Issue

Include:

- Clear description of problem
- Steps to reproduce
- Expected vs actual behavior
- Environment info:
  - OS version
  - Node version
  - Expo SDK version
  - Device/simulator info
- Relevant logs/screenshots
- Code snippets (minimal)

### Useful Commands

```bash
# Get environment info
expo diagnostics

# Check Expo version
expo --version

# View logs
expo start --dev-client

# Clear all caches
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
expo start -c
```

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)
- [Expo Forums](https://forums.expo.dev)
- [GitHub Issues](https://github.com/yourusername/yt-music-manager/issues)

---

**Last Updated**: 2026-01-02
