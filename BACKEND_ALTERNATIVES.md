# Backend Hosting Alternatives

The YT Music Manager backend is currently hosted on Render's free tier, which can cause the service to stop during periods of inactivity. This document outlines alternative free hosting options to improve availability.

## Current Setup

- **Platform**: Render (Free tier)
- **URL**: `https://yt-music-manager-backend.onrender.com`
- **Issue**: Free tier instances spin down after 15 minutes of inactivity, causing cold starts that can take 30+ seconds

## Free Tier Alternatives

### 1. Railway (Recommended)

**Pros:**
- Free tier includes $5/month of usage credits
- No cold start issues during active usage
- Easy deployment from GitHub
- Good performance

**Cons:**
- Limited free hours (~500 hours/month)
- May need to upgrade for heavy usage

**Setup:**
1. Create account at [railway.app](https://railway.app)
2. Connect GitHub repository
3. Deploy the backend service
4. Update `BACKEND_URL` in the mobile app

### 2. Fly.io

**Pros:**
- Free tier includes 3 shared-cpu VMs
- Automatic scaling
- Good global distribution
- No cold starts with proper configuration

**Cons:**
- Requires credit card verification
- Configuration can be complex

**Setup:**
1. Install flyctl CLI
2. Run `fly launch` in the backend directory
3. Configure `fly.toml` with appropriate settings
4. Deploy with `fly deploy`

### 3. Koyeb

**Pros:**
- Generous free tier (1 nano service)
- No cold starts
- Easy deployment from GitHub
- Good performance

**Cons:**
- Limited resources on free tier
- May need to upgrade for production

**Setup:**
1. Create account at [koyeb.com](https://koyeb.com)
2. Create new app from GitHub repository
3. Configure environment variables
4. Deploy

### 4. Vercel (Serverless Functions)

**Pros:**
- Very generous free tier
- Fast cold starts
- Global edge network
- Easy deployment

**Cons:**
- Requires refactoring backend to serverless functions
- 10-second timeout on free tier

**Setup:**
1. Convert backend to Vercel serverless functions
2. Create `vercel.json` configuration
3. Deploy with `vercel` CLI

### 5. Cloudflare Workers

**Pros:**
- Very generous free tier (100,000 requests/day)
- Extremely fast with no cold starts
- Global edge network

**Cons:**
- Requires refactoring to Cloudflare Workers format
- Limited runtime APIs

**Setup:**
1. Convert backend to Workers format
2. Use Wrangler CLI for deployment
3. Configure environment variables

### 6. Deta Space

**Pros:**
- Completely free
- No cold starts
- Simple deployment

**Cons:**
- Limited documentation
- Smaller community

**Setup:**
1. Create account at [deta.space](https://deta.space)
2. Initialize project with Space CLI
3. Deploy

## Keeping Render Free Tier Alive

If you prefer to keep using Render, you can prevent cold starts by:

1. **Cron Job / External Ping Service**: Use a free cron service to ping your backend every 10-14 minutes
   - [cron-job.org](https://cron-job.org) - Free
   - [UptimeRobot](https://uptimerobot.com) - Free tier available

2. **GitHub Actions**: Set up a scheduled workflow to ping the backend

```yaml
name: Keep Backend Alive
on:
  schedule:
    - cron: '*/14 * * * *'  # Every 14 minutes
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping backend
        run: curl -s https://yt-music-manager-backend.onrender.com/health
```

## Recommendation

For the best free experience, we recommend:

1. **Railway** - Best balance of ease of use and performance
2. **Fly.io** - Best if you need global distribution
3. **Keep Render + Ping Service** - Easiest if you don't want to migrate

## Updating the Mobile App

After setting up a new backend host, update the `BACKEND_URL` constant in:

```
src/constants/index.ts
```

```typescript
export const BACKEND_URL = 'https://your-new-backend-url.com';
```

Then rebuild and redeploy the mobile app.
