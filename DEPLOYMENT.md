# Deployment Guide - YT Music Manager

This guide provides detailed instructions for building and deploying the YT Music Manager app to iOS App Store and Google Play Store.

## Prerequisites

### Required Accounts
- [ ] Apple Developer Account ($99/year) - for iOS
- [ ] Google Play Console Account ($25 one-time) - for Android
- [ ] Expo Account (free tier available)
- [ ] GitHub Account (for CI/CD)

### Required Tools
```bash
# Install Expo CLI
npm install -g expo-cli

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login
```

## Environment Configuration

### 1. Set up Environment Variables

Create `.env` file (never commit this):
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# YouTube API (if needed)
YOUTUBE_API_KEY=your-youtube-api-key

# Backend API (for yt-dlp bridge)
BACKEND_API_URL=https://your-backend-api.com
```

### 2. Configure app.json

Update these values:
```json
{
  "expo": {
    "name": "YT Music Manager",
    "slug": "yt-music-manager",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.ytmusicmanager",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.yourcompany.ytmusicmanager",
      "versionCode": 1
    }
  }
}
```

## Android Deployment

### Step 1: Generate Keystore

```bash
# Generate upload keystore
keytool -genkeypair -v -storetype PKCS12 \
  -keystore upload-keystore.keystore \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Store keystore securely (NOT in git)
# Save password in password manager
```

### Step 2: Configure EAS for Android

Update `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "credentialsSource": "local"
      }
    }
  }
}
```

### Step 3: Build Android App Bundle (AAB)

```bash
# Build for production
eas build --platform android --profile production

# Wait for build to complete (10-20 minutes)
# Download AAB when ready
```

### Step 4: Prepare Play Store Assets

Required assets:
- App icon (512x512 px)
- Feature graphic (1024x500 px)
- Phone screenshots (min 2, max 8)
- Tablet screenshots (optional)
- Privacy policy URL

### Step 5: Create Play Store Listing

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Fill in app details:
   - Title: YT Music Manager
   - Short description (80 chars)
   - Full description (4000 chars)
   - Category: Music & Audio
   - Tags: music, youtube, playlist, download
4. Upload screenshots and graphics
5. Set content rating
6. Set target audience
7. Add privacy policy URL

### Step 6: Upload and Release

```bash
# Option 1: Manual upload
# Upload AAB in Play Console → Production → Create new release

# Option 2: Automated (with service account)
eas submit --platform android --profile production
```

### Step 7: Release Management

1. Internal testing track (recommended first)
2. Closed testing (beta)
3. Open testing (if needed)
4. Production release

Timeline: 1-3 days for review

## iOS Deployment

### Step 1: Apple Developer Setup

1. Join Apple Developer Program
2. Create App ID:
   - Name: YT Music Manager
   - Bundle ID: com.yourcompany.ytmusicmanager
   - Capabilities: Background Modes, Network Extensions
3. Create provisioning profiles

### Step 2: Configure EAS for iOS

```bash
# Configure credentials
eas credentials
```

Select options:
- Use existing Apple ID
- Generate new Push Key
- Generate new Distribution Certificate

### Step 3: Build iOS App

```bash
# Build for production
eas build --platform ios --profile production

# Wait for build to complete (10-30 minutes)
# Download IPA when ready
```

### Step 4: Prepare App Store Assets

Required assets:
- App icon (1024x1024 px)
- iPhone screenshots (6.5", 5.5")
- iPad screenshots (12.9", optional)
- App preview video (optional)
- Privacy policy URL

### Step 5: Create App Store Connect Listing

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app
3. Fill in app information:
   - Name: YT Music Manager
   - Subtitle (30 chars)
   - Category: Music
   - Description (4000 chars)
   - Keywords (100 chars)
   - Support URL
   - Marketing URL (optional)
4. Upload screenshots
5. Set age rating
6. Add privacy policy

### Step 6: Upload Build

```bash
# Option 1: Manual upload via Transporter app
# Download Transporter from Mac App Store
# Upload IPA file

# Option 2: Automated
eas submit --platform ios --profile production
```

### Step 7: Submit for Review

1. Select build in App Store Connect
2. Fill in review information:
   - Demo account (if needed)
   - Notes for reviewer
   - Contact information
3. Submit for review

Timeline: 24-48 hours for review

## CI/CD with GitHub Actions

### Setup Secrets

Add to GitHub repository secrets:
```
EXPO_TOKEN=your-expo-token
ANDROID_KEYSTORE_BASE64=base64-encoded-keystore
ANDROID_KEYSTORE_PASSWORD=keystore-password
ANDROID_KEY_ALIAS=upload
ANDROID_KEY_PASSWORD=key-password
APPLE_ID=your-apple-id
APPLE_TEAM_ID=your-team-id
APPLE_APP_SPECIFIC_PASSWORD=app-specific-password
```

### Automated Build Workflow

The `.github/workflows/ci.yml` handles:
- Linting and type checking
- Running tests
- Building APK/IPA on main branch
- Uploading artifacts

### Automated Deployment

For automated deployment:
1. Tag release: `git tag v1.0.0`
2. Push tag: `git push origin v1.0.0`
3. GitHub Actions builds and submits
4. Monitor in respective consoles

## Backend Setup (yt-dlp Bridge)

### Option 1: Node.js Backend

```javascript
// server.js
const express = require('express');
const { exec } = require('child_process');
const app = express();

app.get('/download', async (req, res) => {
  const { id, quality } = req.query;
  
  // Use yt-dlp to get download URL
  exec(`yt-dlp -f bestaudio -g https://youtube.com/watch?v=${id}`, 
    (error, stdout) => {
      if (error) {
        return res.status(500).json({ error: 'Download failed' });
      }
      res.json({ url: stdout.trim() });
    }
  );
});

app.listen(3000);
```

Deploy to:
- Heroku
- AWS Lambda
- Google Cloud Functions
- DigitalOcean

### Option 2: Python Backend

```python
# app.py
from flask import Flask, request, jsonify
import yt_dlp

app = Flask(__name__)

@app.route('/download')
def download():
    video_id = request.args.get('id')
    quality = request.args.get('quality', '192')
    
    ydl_opts = {
        'format': 'bestaudio',
        'extractaudio': True,
        'audioformat': 'mp3',
        'audioquality': quality,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f'https://youtube.com/watch?v={video_id}', 
                                download=False)
        url = info['url']
        return jsonify({'url': url})

if __name__ == '__main__':
    app.run()
```

### Security Considerations

- Implement rate limiting
- Add authentication
- Use HTTPS only
- Validate inputs
- Monitor usage

## Testing Before Release

### Pre-Release Checklist

- [ ] Test on physical Android device
- [ ] Test on physical iOS device
- [ ] Test all core features
- [ ] Test edge cases
- [ ] Test offline functionality
- [ ] Test with poor network
- [ ] Test battery usage
- [ ] Test storage management
- [ ] Test permissions
- [ ] Verify no crashes
- [ ] Check performance
- [ ] Validate UI on different screen sizes

### Beta Testing

1. Use TestFlight (iOS) and Internal Testing (Android)
2. Recruit 10-50 beta testers
3. Collect feedback
4. Fix critical issues
5. Release to production

## Monitoring and Analytics

### Crash Reporting

Setup Sentry:
```bash
npm install @sentry/react-native

# Configure in App.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: __DEV__ ? 'development' : 'production',
});
```

### Analytics

Setup Firebase Analytics:
```bash
expo install @react-native-firebase/app @react-native-firebase/analytics

# Track events
analytics().logEvent('playlist_added', {
  playlist_id: playlistId,
});
```

## Post-Release

### Monitoring

Monitor:
- Crash reports
- User reviews
- Download numbers
- Active users
- Feature usage

### Updates

For updates:
1. Increment version in app.json
2. Update CHANGELOG.md
3. Build and test
4. Submit to stores
5. Monitor rollout

### Over-the-Air (OTA) Updates

For minor updates:
```bash
# Publish OTA update
eas update --branch production --message "Bug fixes"
```

## Troubleshooting

### Common Build Issues

**Android build fails**:
```bash
# Clear Gradle cache
cd android && ./gradlew clean

# Rebuild
eas build --platform android --clear-cache
```

**iOS build fails**:
```bash
# Check provisioning profiles
eas credentials

# Clear cache and rebuild
eas build --platform ios --clear-cache
```

### Store Rejection Issues

**App Store common rejections**:
- Missing privacy policy
- Incomplete app functionality
- UI/UX issues
- Crashes
- Missing demo account

**Play Store common rejections**:
- Missing privacy policy
- Permission justification needed
- Content policy violations
- Technical issues

## Support and Maintenance

### Version Strategy

- Patch (1.0.x): Bug fixes only
- Minor (1.x.0): New features, backward compatible
- Major (x.0.0): Breaking changes

### Maintenance Schedule

- Monitor daily for first week
- Weekly updates for first month
- Monthly updates thereafter
- Critical fixes as needed

## Resources

### Official Documentation
- [Expo Documentation](https://docs.expo.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Play Store Guidelines](https://play.google.com/console/about/guides/)

### Community
- Expo Discord
- React Native Community
- Stack Overflow

---

**Last Updated**: 2026-01-02  
**Version**: 1.0.0
