# Quick Start Guide - SSO Bridge System

## Current System Status

### ✅ Running Services
- **Admin Dashboard**: Running on port 3000
- **Backend API**: Running on port 3001

### 🔗 Connections
- **Database**: ✅ SQLite connected (`./db/sso.db`)
- **Redis**: ⚠️ Not connected (optional)
- **Dashboard-Backend**: ❌ Not connected (using mock data)

## Customizing Ports

### Change Admin Dashboard Port

**Method 1: Using Environment Variables (Recommended)**

1. Edit `.env.local`:
   ```bash
   ADMIN_PORT=4000
   ```

2. Restart the admin dashboard:
   ```bash
   # Kill existing process (if running)
   pkill -f "next dev"

   # Start with new port
   bun run dev
   ```

**Method 2: Using Command Line**

```bash
ADMIN_PORT=4000 bun run dev
```

### Change Backend API Port

**Method 1: Using Environment Variables (Recommended)**

1. Edit `.env.local`:
   ```bash
   BACKEND_PORT=4001
   SSO_CALLBACK_URL="http://localhost:4001/api/v1/auth/callback"
   NEXT_PUBLIC_API_URL="http://localhost:4001"
   ```

2. Update `mini-services/sso-backend/.env`:
   ```bash
   PORT=4001
   BACKEND_PORT=4001
   ```

3. Restart the backend:
   ```bash
   # From backend directory
   cd mini-services/sso-backend

   # Kill existing process
   pkill -f "bun.*index.ts"

   # Start with new port
   bun run dev
   ```

**Method 2: Using Command Line**

```bash
cd mini-services/sso-backend
PORT=4001 bun run dev
```

## Customizing Database Path

### SQLite Database Path

Edit `.env.local`:

```bash
# Relative path (from project root)
DATABASE_URL="file:./db/sso.db"

# Or absolute path
DATABASE_URL="file:/custom/path/to/database/sso.db"

# Or in a different directory
DATABASE_URL="file:./data/production/sso.db"
```

Then run:
```bash
bun run db:push
```

### Switching to PostgreSQL

1. Update `.env.local`:
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/sso_bridge"
   ```

2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  # Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

3. Update `mini-services/sso-backend/prisma/schema.prisma` (same change)

4. Run migrations:
   ```bash
   bun run db:push
   ```

## Customizing Redis

### Enable Redis

1. Ensure Redis is running:
   ```bash
   # Check if Redis is available
   redis-cli ping

   # Should respond with: PONG
   ```

2. Update `.env.local`:
   ```bash
   REDIS_URL="redis://localhost:6379"
   ```

3. Restart backend:
   ```bash
   cd mini-services/sso-backend
   pkill -f "bun.*index.ts"
   bun run dev
   ```

4. Verify Redis is connected:
   ```bash
   curl http://localhost:3001/health

   # Should show:
   {
     "checks": {
       "redis": "ok",        # Changed from "error"
       "database": "ok"
     }
   }
   ```

### Disable Redis

Simply remove or comment out the `REDIS_URL` from `.env.local`:
```bash
# REDIS_URL="redis://localhost:6379"
```

The system will automatically fall back to database-only mode.

## Example Configurations

### Development (Default)
```bash
ADMIN_PORT=3000
BACKEND_PORT=3001
DATABASE_URL="file:./db/sso.db"
# REDIS_URL not set
CORS_ORIGIN="*"
NODE_ENV=development
```

### Development with Redis
```bash
ADMIN_PORT=3000
BACKEND_PORT=3001
DATABASE_URL="file:./db/sso.db"
REDIS_URL="redis://localhost:6379"
CORS_ORIGIN="*"
NODE_ENV=development
```

### Production with PostgreSQL and Redis
```bash
ADMIN_PORT=80
BACKEND_PORT=8080
DATABASE_URL="postgresql://sso_user:secure_password@db-server:5432/sso_bridge"
REDIS_URL="redis://redis-server:6379"
CORS_ORIGIN="https://app1.com,https://app2.com"
NODE_ENV=production
JWT_SECRET="your-production-secret-key"
ENCRYPTION_KEY="32-char-production-encryption-key"
```

## Common Tasks

### Check Which Database is Being Used

```bash
# Check Prisma schema
cat prisma/schema.prisma | grep "provider ="

# If it shows "sqlite", you're using SQLite
# If it shows "postgresql", you're using PostgreSQL
```

### Check Database Connection

```bash
curl http://localhost:3001/health
```

If `database: "ok"`, the connection is working.

### Check if Dashboard is Using Real Data

Currently, the dashboard uses mock data. To check if it's connected to the backend:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the dashboard page
4. Look for API requests to `/api/v1/tenants`, `/api/v1/apps`, etc.

If no API requests are shown, the dashboard is using mock data.

### Test Backend API

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test tenants endpoint
curl http://localhost:3001/api/v1/tenants

# Test apps endpoint
curl http://localhost:3001/api/v1/apps

# Test providers endpoint
curl http://localhost:3001/api/v1/providers
```

### Change All Ports at Once

```bash
# In .env.local
ADMIN_PORT=5000
BACKEND_PORT=5001
NEXT_PUBLIC_API_URL="http://localhost:5001"
SSO_CALLBACK_URL="http://localhost:5001/api/v1/auth/callback"

# In mini-services/sso-backend/.env
PORT=5001
BACKEND_PORT=5001

# Restart both services
# Terminal 1:
bun run dev

# Terminal 2:
cd mini-services/sso-backend
bun run dev
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using the port
lsof -i :3000  # or :3001, or any port

# Kill the process
kill -9 <PID>
```

### Database File Not Found

```bash
# Check if database file exists
ls -la ./db/sso.db

# If not exists, run database setup
bun run db:push
```

### Redis Connection Failed

This is OK! The system works without Redis. To fix:

1. Install Redis: `sudo apt-get install redis-server` (Ubuntu/Debian)
2. Start Redis: `sudo systemctl start redis`
3. Verify: `redis-cli ping`
4. Check health endpoint: `curl http://localhost:3001/health`

If you still see `redis: "error"`, the system is working correctly with database-only mode.

## Next Steps

1. ✅ Ports are customizable via environment variables
2. ✅ Database path is configurable
3. ✅ Redis is optional
4. ⚠️ Dashboard needs to be connected to backend (see `src/lib/api.ts`)
5. 📖 See [CONFIGURATION.md](./CONFIGURATION.md) for detailed configuration options
