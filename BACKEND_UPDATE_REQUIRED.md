# Backend Update Required

The mobile app has been updated to use the backend for playlist fetching. You need to add playlist endpoints to your backend.

## Files to Update

### 1. Update `package.json`

Add the `ytpl` dependency for playlist fetching:

```json
{
  "name": "yt-music-backend",
  "version": "1.0.0",
  "description": "Backend for downloading YouTube audio",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ytdl-core": "^4.11.5",
    "ytpl": "^2.3.0",
    "dotenv": "^16.3.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 2. Replace `server.js` with:

```javascript
const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'YT Music Backend',
    version: '1.1.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Get playlist info
app.get('/api/playlist-info', async (req, res) => {
  try {
    const { playlistId } = req.query;
    
    if (!playlistId) {
      return res.status(400).json({ error: 'playlistId parameter is required' });
    }

    // Validate playlist ID
    if (!ytpl.validateID(playlistId)) {
      return res.status(400).json({ error: 'Invalid playlist ID' });
    }

    // Get playlist info (limit to 1 item just to get metadata)
    const playlist = await ytpl(playlistId, { limit: 1 });

    res.json({
      id: playlist.id,
      title: playlist.title,
      description: playlist.description || '',
      thumbnailUrl: playlist.bestThumbnail?.url || '',
      itemCount: playlist.estimatedItemCount || playlist.items.length
    });

  } catch (error) {
    console.error('Error fetching playlist info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch playlist info',
      message: error.message 
    });
  }
});

// Get playlist videos
app.get('/api/playlist-videos', async (req, res) => {
  try {
    const { playlistId } = req.query;
    
    if (!playlistId) {
      return res.status(400).json({ error: 'playlistId parameter is required' });
    }

    // Validate playlist ID
    if (!ytpl.validateID(playlistId)) {
      return res.status(400).json({ error: 'Invalid playlist ID' });
    }

    // Get full playlist with all items
    const playlist = await ytpl(playlistId, { limit: Infinity });

    const videos = playlist.items.map(item => ({
      id: item.id,
      title: item.title,
      author: item.author?.name || 'Unknown',
      duration: item.durationSec || 0,
      thumbnailUrl: item.bestThumbnail?.url || item.thumbnails?.[0]?.url || ''
    }));

    res.json({
      playlistId: playlist.id,
      title: playlist.title,
      itemCount: videos.length,
      videos
    });

  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    res.status(500).json({ 
      error: 'Failed to fetch playlist videos',
      message: error.message 
    });
  }
});

// Get download info for a video
app.get('/api/download-info', async (req, res) => {
  try {
    const { videoId } = req.query;
    
    if (!videoId) {
      return res.status(400).json({ error: 'videoId parameter is required' });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Validate video URL
    if (!ytdl.validateURL(videoUrl)) {
      return res.status(400).json({ error: 'Invalid YouTube video ID' });
    }

    // Get video info
    const info = await ytdl.getInfo(videoUrl);
    
    // Get audio formats
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    // Find best audio quality
    const bestAudio = audioFormats.reduce((best, format) => {
      if (!best || (format.audioBitrate && format.audioBitrate > best.audioBitrate)) {
        return format;
      }
      return best;
    }, null);

    res.json({
      videoId: videoId,
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      lengthSeconds: info.videoDetails.lengthSeconds,
      downloadUrl: bestAudio?.url || null,
      quality: bestAudio?.audioBitrate || 'unknown',
      format: bestAudio?.mimeType?.split(';')[0] || 'audio/webm'
    });

  } catch (error) {
    console.error('Error fetching download info:', error);
    res.status(500).json({ 
      error: 'Failed to fetch download info',
      message: error.message 
    });
  }
});

// Get direct download stream
app.get('/api/download', async (req, res) => {
  try {
    const { videoId, quality } = req.query;
    
    if (!videoId) {
      return res.status(400).json({ error: 'videoId parameter is required' });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    if (!ytdl.validateURL(videoUrl)) {
      return res.status(400).json({ error: 'Invalid YouTube video ID' });
    }

    // Get video info first to set proper headers
    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // Stream the audio
    const audioStream = ytdl(videoUrl, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });

    audioStream.pipe(res);

    audioStream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    });

  } catch (error) {
    console.error('Error downloading:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to download',
        message: error.message 
      });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

## Deployment Steps

1. **Update your local backend repository:**
   ```bash
   cd yt-music-manager-backend
   # Replace package.json and server.js with the code above
   ```

2. **Test locally:**
   ```bash
   npm install
   npm run dev
   # Test the endpoints:
   # http://localhost:3000/api/playlist-info?playlistId=PLxxxxxx
   # http://localhost:3000/api/playlist-videos?playlistId=PLxxxxxx
   ```

3. **Deploy to Render:**
   ```bash
   git add .
   git commit -m "Add playlist endpoints"
   git push origin main
   ```

4. **Wait for Render to redeploy** (automatic if you have auto-deploy enabled)

5. **Test the deployed endpoints:**
   - `https://yt-music-manager-backend.onrender.com/api/playlist-info?playlistId=PLxxxxxx`
   - `https://yt-music-manager-backend.onrender.com/api/playlist-videos?playlistId=PLxxxxxx`

## API Endpoints

### GET /api/playlist-info
Get metadata about a playlist.

**Query Parameters:**
- `playlistId` (required): YouTube playlist ID

**Response:**
```json
{
  "id": "PLxxxxxxxxx",
  "title": "Playlist Title",
  "description": "Playlist description",
  "thumbnailUrl": "https://i.ytimg.com/vi/xxx/hqdefault.jpg",
  "itemCount": 25
}
```

### GET /api/playlist-videos
Get all videos in a playlist.

**Query Parameters:**
- `playlistId` (required): YouTube playlist ID

**Response:**
```json
{
  "playlistId": "PLxxxxxxxxx",
  "title": "Playlist Title",
  "itemCount": 25,
  "videos": [
    {
      "id": "video_id",
      "title": "Video Title",
      "author": "Channel Name",
      "duration": 210,
      "thumbnailUrl": "https://i.ytimg.com/vi/xxx/hqdefault.jpg"
    }
  ]
}
```

### GET /api/download-info (existing)
Get download information for a video.

### GET /api/download (existing)
Stream audio directly.
