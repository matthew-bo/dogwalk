# Upstash Redis Setup for Dog Walk Gamble

## Why Replace Local Redis?

Since we're moving all sensitive data to the cloud (Supabase), we should also move Redis to the cloud to avoid storing any session data locally. Redis in our gambling platform stores:

- 🎮 **Active game sessions** (with bet amounts, multipliers)
- 🔐 **User authentication sessions** 
- 🚫 **JWT blacklisted tokens**
- ⚡ **Rate limiting data**

## Upstash Redis Benefits

✅ **Fully managed** - No setup or maintenance  
✅ **Global edge locations** - Low latency worldwide  
✅ **Pay per request** - Cost effective for development  
✅ **REST API** - Works with any language/platform  
✅ **Same Redis commands** - Drop-in replacement  
✅ **Free tier** - 10,000 requests per day  

## Step 1: Create Upstash Account

1. Go to [upstash.com](https://upstash.com)
2. Sign up with GitHub (free)
3. Click "Create Database"
4. Fill in details:
   - **Name**: `dogwalk-redis-dev`
   - **Type**: Regional (cheaper) or Global (faster)
   - **Region**: Choose closest to your Supabase region
   - **TLS**: Enable (for security)

## Step 2: Get Connection Details

After database creation:

1. Go to your database dashboard
2. Copy the **Redis Connect URL**:
   ```
   redis://default:[PASSWORD]@[ENDPOINT]:6379
   ```
3. Copy the **REST URL** (alternative connection method):
   ```
   https://[ENDPOINT].upstash.io
   ```
4. Copy the **REST Token** for authentication

## Step 3: Update Environment Variables

Replace your local Redis configuration in `.env`:

```bash
# Replace local Redis
# REDIS_URL="redis://localhost:6379"

# With Upstash Redis
REDIS_URL="redis://default:[YOUR-PASSWORD]@[YOUR-ENDPOINT]:6379"

# Optional: REST API alternative (faster for single commands)
UPSTASH_REDIS_REST_URL="https://[YOUR-ENDPOINT].upstash.io"
UPSTASH_REDIS_REST_TOKEN="[YOUR-REST-TOKEN]"
```

## Step 4: Update Redis Client (Optional)

For better performance with Upstash, you can use their optimized client:

```bash
npm install @upstash/redis
```

Then update your Redis service (`apps/backend/src/services/RedisService.ts`):

```typescript
// Option 1: Keep existing Redis client (works fine)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Option 2: Use Upstash optimized client (recommended)
import { Redis } from '@upstash/redis';
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
```

## Step 5: Test the Connection

```bash
# Test your updated configuration
npm run dev
```

The application should connect to Upstash Redis instead of local Redis.

## Step 6: Monitor Usage

1. Go to your Upstash dashboard
2. Monitor requests, latency, and costs
3. The free tier (10K requests/day) should cover development needs

## Production Setup

For production:

1. Create a separate Upstash database for production
2. Choose **Global** type for better worldwide performance
3. Enable **TLS** for security
4. Set up **alerts** for usage monitoring

## Cost Estimation

### Free Tier (Development)
- **10,000 requests per day**
- **1GB storage**
- **Perfect for development and testing**

### Paid Tier (Production)
- **$0.20 per 100K requests**
- **$0.25 per GB storage**
- **Example**: 1M requests/month + 5GB ≈ **$3.25/month**

## Benefits Over Local Redis

### Security
- No sensitive session data on local machine
- Encrypted connections (TLS)
- Professional data center security

### Consistency
- Same Redis instance for local dev and production
- No environment differences
- Reliable data persistence

### Performance
- Global edge locations
- Better uptime than local setup
- Automatic scaling

### Maintenance
- No Redis installation or updates needed
- Automatic backups
- Professional monitoring

## Migration Checklist

- [ ] Create Upstash Redis database
- [ ] Update `.env` with new Redis URL
- [ ] Test local development
- [ ] Update production environment variables
- [ ] Monitor usage in Upstash dashboard
- [ ] Remove local Redis installation (optional)

## Troubleshooting

### Connection Issues
- Verify Redis URL format
- Check TLS setting (should be enabled)
- Ensure firewall allows outbound connections

### Performance Issues
- Use Upstash client for better performance
- Choose Global database for worldwide access
- Monitor latency in dashboard

### Cost Concerns
- Monitor request usage in dashboard
- Optimize Redis usage patterns
- Set up billing alerts

## Complete Cloud Setup

With Supabase + Upstash, you now have:

✅ **Database**: Supabase PostgreSQL  
✅ **Redis**: Upstash Redis  
✅ **No local sensitive data storage**  
✅ **Identical dev and production environments**  
✅ **Professional security and backups**  
✅ **Scalable infrastructure**  

Your local machine only runs application code - all data stays in the cloud! 