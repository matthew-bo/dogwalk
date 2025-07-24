# Supabase Setup Guide for Dog Walk Gamble

## Why Supabase?
- ✅ Same database for local development and production
- ✅ No sensitive financial data stored locally
- ✅ PostgreSQL with real-time capabilities
- ✅ Built-in authentication and Row Level Security
- ✅ Free tier: 200 concurrent clients, 100 messages/second

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub (free)
3. Click "New Project"
4. Fill in details:
   - **Organization**: Create new or use existing
   - **Project Name**: `dogwalk-dev` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your location

## Step 2: Get Your Connection Details

After project creation (takes ~2 minutes), go to your project dashboard:

### Database URL
- Go to **Settings** → **Database**
- Copy the **Connection string** for URI
- It looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### API Keys
- Go to **Settings** → **API**
- Copy these keys:
  - **Project URL**: `https://[PROJECT-REF].supabase.co`
  - **anon/public key**: For client-side operations
  - **service_role key**: For server-side operations (keep secret!)

## Step 3: Configure Environment Variables

Create a `.env` file in your project root:

```bash
# Supabase Configuration
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_KEY="[YOUR-SERVICE-ROLE-KEY]"

# Redis (for local session management - we'll use Upstash later)
REDIS_URL="redis://localhost:6379"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here-make-it-long-and-random"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-here-also-long-and-random"

# API Configuration
PORT=3002
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"

# Coinbase Commerce (for crypto payments)
COINBASE_COMMERCE_API_KEY="your-coinbase-api-key"
COINBASE_COMMERCE_WEBHOOK_SECRET="your-webhook-secret"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

## Step 4: Apply Database Schema

### Install Supabase CLI (optional but recommended)
```bash
npm install -g supabase-cli
```

### Apply Base Schema
1. Go to your Supabase dashboard
2. Click **SQL Editor** in the sidebar
3. Copy and paste the contents of `apps/backend/prisma/schema.prisma` (converted to SQL)
4. Run the SQL to create tables

### Apply Enhanced Schema
1. In SQL Editor, copy and paste the contents of:
   `apps/backend/prisma/enhanced-schema-additions.sql`
2. Run the SQL to add enhanced game features

## Step 5: Configure Row Level Security (RLS)

In the SQL Editor, run these security policies:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
FOR SELECT USING (auth.uid()::text = id::text);

-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can only see their own game sessions
CREATE POLICY "Users can view own game sessions" ON game_sessions
FOR SELECT USING (auth.uid()::text = user_id::text);
```

## Step 6: Install Dependencies and Run

```bash
# Install dependencies
npm install

# Install Supabase client
npm install @supabase/supabase-js

# Generate Prisma client
npm run db:generate

# Start the application
npm run dev
```

## Step 7: For Production

1. Create a second Supabase project for production
2. Use same schema setup process
3. Update environment variables for production deployment

## Redis Alternative: Upstash

For a fully cloud setup, replace Redis with Upstash:

1. Go to [upstash.com](https://upstash.com)
2. Create free Redis database
3. Update `REDIS_URL` in `.env` with Upstash connection string

## Benefits of This Setup

✅ **Security**: No sensitive financial data on local machine  
✅ **Consistency**: Same database infrastructure everywhere  
✅ **Scalability**: Supabase handles scaling automatically  
✅ **Real-time**: Built-in WebSocket support for live games  
✅ **Compliance**: Built-in audit logs and security features  
✅ **Backup**: Automatic daily backups  
✅ **Cost**: Free tier covers development needs  

## Troubleshooting

### Connection Issues
- Check DATABASE_URL format
- Verify password and project reference
- Ensure IP is whitelisted (Supabase allows all by default)

### Permission Errors
- Verify service_role key for server operations
- Check RLS policies are configured correctly
- Ensure user authentication is working

### Performance
- Use connection pooling for production
- Monitor usage in Supabase dashboard
- Upgrade to paid plan if needed

## Next Steps

1. Set up your Supabase project
2. Configure environment variables
3. Apply database schema
4. Test connection with `npm run dev`
5. Deploy to production with separate Supabase project 