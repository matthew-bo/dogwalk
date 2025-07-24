# Windows Local Development Setup

## Quick Installation

### 1. Install PostgreSQL
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer with these settings:
   - Password: `password`
   - Port: `5432`
   - Locale: Default
3. After installation, create the database:
   ```cmd
   createdb -U postgres dogwalk
   ```

### 2. Install Redis (Optional - the app will work without it)
1. Download Redis from: https://github.com/microsoftarchive/redis/releases
2. Extract to `C:\redis`
3. Open Command Prompt as Administrator:
   ```cmd
   cd C:\redis
   redis-server.exe
   ```

### 3. Run the Application
```powershell
# Navigate to project root
cd C:\Users\mbo1\dogwalk

# Run database migrations
npm run db:migrate

# Start both frontend and backend
npm run dev
```

## Alternative: Docker Desktop
If you prefer Docker:
1. Install Docker Desktop for Windows
2. Run: `docker compose up -d`
3. Run: `npm run db:migrate`
4. Run: `npm run dev`

## Troubleshooting
- If PostgreSQL connection fails, check if the service is running in Windows Services
- If port 5432 is busy, change the port in both .env and PostgreSQL config
- The frontend will be at: http://localhost:5173
- The backend will be at: http://localhost:3001 