# 🚀 Production Deployment Guide - Dog Walk Gamble

## 📋 Pre-Deployment Checklist

### ✅ **Backend API Complete**
- [x] Admin system with dashboard APIs
- [x] Real crypto price integration (CoinGecko + Coinbase fallback)
- [x] User management and statistics
- [x] Payment system with Coinbase Commerce
- [x] Game engine with provably fair RNG
- [x] Real-time WebSocket features
- [x] Monitoring and health checks
- [x] Comprehensive audit logging

### ✅ **Frontend Complete**  
- [x] All pages implemented and functional
- [x] Admin dashboard with real data
- [x] Payment modals with live crypto prices
- [x] Game interface with real-time updates
- [x] User profiles with statistics
- [x] Leaderboards with live data
- [x] Demo mode for immediate engagement

## 🔧 Environment Configuration

### **Required Environment Variables**

Create these files:
- `apps/backend/.env` (production config)
- `apps/frontend/.env` (frontend config)

#### **Backend Configuration (`apps/backend/.env`)**
```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://username:password@host:5432/dogwalk_production"

# Redis Cache
REDIS_URL="redis://host:6379"

# Security
JWT_SECRET="generate-secure-256-bit-key"
JWT_ACCESS_TOKEN_EXPIRY="15m"
JWT_REFRESH_TOKEN_EXPIRY="7d"

# Server
PORT=3001
NODE_ENV="production"
CORS_ORIGIN="https://yourdomain.com"

# Coinbase Commerce
COINBASE_COMMERCE_API_KEY="your-key-from-coinbase"
COINBASE_WEBHOOK_SECRET="your-webhook-secret"

# Admin Access
ADMIN_EMAILS="admin@yourdomain.com,admin2@yourdomain.com"

# Hot Wallet Addresses (for admin dashboard display)
BITCOIN_HOT_WALLET_ADDRESS="bc1q..."
ETHEREUM_HOT_WALLET_ADDRESS="0x..."

# Business Limits
MIN_DEPOSIT_USD="10"
MAX_DEPOSIT_USD="50000"
DAILY_WITHDRAWAL_LIMIT_USD="100000"
```

#### **Frontend Configuration (`apps/frontend/.env`)**
```env
VITE_API_URL="https://api.yourdomain.com"
VITE_WEBSOCKET_URL="wss://api.yourdomain.com"
VITE_ENVIRONMENT="production"
```

## 🏗️ Infrastructure Setup

### **1. Database Setup (PostgreSQL)**

```bash
# Create production database
createdb dogwalk_production

# Run migrations
cd apps/backend
npx prisma migrate deploy
npx prisma generate
```

### **2. Redis Setup**
```bash
# Install Redis
# Ubuntu/Debian:
sudo apt install redis-server

# macOS:
brew install redis

# Start Redis
redis-server
```

### **3. Coinbase Commerce Setup**

1. **Create Coinbase Commerce Account**
   - Go to [commerce.coinbase.com](https://commerce.coinbase.com)
   - Create business account
   - Complete KYC verification

2. **Get API Credentials**
   ```bash
   # In Coinbase Commerce dashboard:
   # Settings → API keys → Create API key
   COINBASE_COMMERCE_API_KEY="your-api-key"
   
   # Settings → Webhook endpoints → Create endpoint
   # URL: https://yourdomain.com/api/webhooks/coinbase
   COINBASE_WEBHOOK_SECRET="your-webhook-secret"
   ```

3. **Configure Webhook**
   - Endpoint URL: `https://yourdomain.com/api/webhooks/coinbase`
   - Events: `charge:confirmed`, `charge:failed`

## 🚀 Deployment

### **Option 1: Railway (Recommended for MVP)**

#### **Backend Deployment**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy backend
cd apps/backend
railway link  # Link to your project
railway up    # Deploy

# Set environment variables in Railway dashboard
```

#### **Frontend Deployment (Vercel)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd apps/frontend  
vercel         # Follow prompts
vercel --prod  # Deploy to production
```

### **Option 2: AWS/GCP/Azure**

#### **Backend (Node.js App)**
- Deploy to App Engine, Elastic Beanstalk, or Azure App Service
- Configure PostgreSQL (Cloud SQL/RDS/Azure Database)
- Configure Redis (ElastiCache/Cloud Memorystore/Azure Cache)

#### **Frontend (Static Site)**
- Deploy to S3+CloudFront, Cloud Storage, or Azure Static Web Apps

## 📊 Monitoring Setup

### **1. Health Check Endpoints**
```bash
# Test after deployment:
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/api/admin/system/health
```

### **2. Logging Setup**
The app includes structured logging. For production:

```bash
# View logs (Railway)
railway logs

# View logs (Vercel)
vercel logs

# Set up log aggregation (recommended):
# - Datadog
# - Loggly  
# - CloudWatch
```

### **3. Uptime Monitoring**
Set up monitoring with:
- **UptimeRobot** (free)
- **Pingdom** 
- **StatusCake**

Monitor these endpoints:
- `https://yourdomain.com` (frontend)
- `https://api.yourdomain.com/health` (backend)

## 🔒 Security Checklist

### **SSL/HTTPS**
- [x] Frontend: Automatic with Vercel
- [x] Backend: Automatic with Railway
- [x] Custom domain with SSL certificate

### **Environment Security**
- [x] All secrets in environment variables (never in code)
- [x] Different keys for development/production
- [x] JWT secret is 256+ bits random
- [x] Database passwords are strong

### **API Security**
- [x] Rate limiting enabled
- [x] CORS properly configured
- [x] Request validation with Joi
- [x] SQL injection protection (Prisma)
- [x] XSS protection (helmet middleware)

### **Business Security**
- [x] Admin access restricted by email
- [x] Withdrawal approvals required
- [x] Daily withdrawal limits
- [x] Audit logging for all transactions
- [x] Emergency stop functionality

## 💰 Payment Integration Testing

### **1. Test Coinbase Commerce**
```bash
# Test deposit flow:
1. Create account on your app
2. Go to deposit modal
3. Generate crypto address
4. Send test amount to address
5. Verify webhook receives confirmation
6. Check balance updates in app

# Test withdrawal flow:
1. Request withdrawal
2. Check admin dashboard for pending withdrawal
3. Approve withdrawal manually
4. Verify transaction is marked as completed
```

### **2. Monitor Transactions**
```bash
# Check admin dashboard:
https://yourdomain.com/admin

# View transaction logs:
GET /api/admin/transactions/recent
GET /api/admin/withdrawals/pending
```

## 📈 Business Operations

### **1. Admin Dashboard Access**
```bash
# Add admin user:
1. Register account with admin email (from ADMIN_EMAILS)
2. Access admin dashboard: https://yourdomain.com/admin
3. Monitor wallets, transactions, users
```

### **2. Daily Operations**
- **Morning**: Check liquidity levels, pending withdrawals
- **Ongoing**: Monitor user activity, transaction volume
- **Evening**: Review audit logs, check system health

### **3. Financial Management**
- **Deposits**: Automatic via Coinbase Commerce
- **Withdrawals**: Manual approval required via admin dashboard  
- **Hot Wallet**: Monitor balances, transfer to cold storage when needed
- **Reporting**: Export transaction data for accounting

## 🆘 Emergency Procedures

### **Emergency Stop Withdrawals**
```bash
# Via admin dashboard:
POST /api/admin/emergency/stop

# Or manually in Redis:
redis-cli SET emergency:withdrawals_stopped true EX 3600
```

### **System Issues**
1. **Database Down**: Check DATABASE_URL, restart database service
2. **Redis Down**: Check REDIS_URL, restart Redis service  
3. **Payment Issues**: Check Coinbase Commerce dashboard
4. **High Error Rate**: Check logs, potentially restart application

## 📞 Support Contacts

### **Technical Issues**
- **Coinbase Commerce**: [commerce.coinbase.com/support](https://commerce.coinbase.com/support)
- **Railway**: [railway.app/help](https://railway.app/help)
- **Vercel**: [vercel.com/support](https://vercel.com/support)

### **Legal/Compliance**
- Consult with gambling law attorney for your jurisdiction
- Ensure compliance with local financial regulations
- Consider KYC/AML requirements for your market

## 🎯 Post-Launch Checklist

### **Week 1**
- [ ] Monitor user registration and deposit flows
- [ ] Verify all transactions are processing correctly
- [ ] Check admin dashboard functionality
- [ ] Review system performance and error rates
- [ ] Test emergency procedures

### **Month 1**
- [ ] Analyze user behavior and game metrics
- [ ] Optimize conversion rates from demo to real money
- [ ] Review and adjust withdrawal limits based on volume
- [ ] Plan additional payment methods if needed
- [ ] Consider implementing automated withdrawal processing

## 🚀 **Ready for Production Launch!**

With this setup, you have:
✅ **Professional gambling platform** with real money handling
✅ **Coinbase Commerce integration** for crypto payments
✅ **Admin dashboard** for business management  
✅ **Monitoring and alerting** for operational awareness
✅ **Security measures** appropriate for financial applications
✅ **Scalable infrastructure** ready for growth

**🎉 Your platform is production-ready for MVP launch!** 