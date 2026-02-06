# SSO Bridge System - Configuration Guide

## Overview

The SSO Bridge System supports both PostgreSQL and SQLite databases, with Redis as an optional caching layer for enhanced performance.

## Current Status

### Database Connection
- **Currently Using**: SQLite
- **Location**: `./db/sso.db` (relative to project root)
- **Why SQLite**: This environment doesn't have PostgreSQL available, so the system is configured to use SQLite for development and testing.

**Note**: The dashboard is **NOT currently connected** to the backend API. It's using mock data. You'll need to connect it to fetch real data.

### Redis Connection
- **Status**: Optional (Not Required)
- **Current**: Not connected (Redis not available in this environment)
- **Impact**: The system works perfectly without Redis. Redis is only used for enhanced performance (session caching).

## Configuration Options

### 1. Port Configuration

#### Admin Dashboard Port
```bash
# In .env.local
ADMIN_PORT=3000
```

#### Backend API Port
```bash
# In .env.local
BACKEND_PORT=3001
```

### 2. Database Configuration

#### SQLite (Default, Works Out of the Box)
```bash
# In .env.local
DATABASE_URL="file:./db/sso.db"
```

**Notes**:
- Database file is created automatically
- No additional setup required
- Perfect for development and testing

#### PostgreSQL (Production Recommended)
```bash
# In .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/sso_bridge?schema=public"
```

**To switch to PostgreSQL**:
1. Install PostgreSQL
2. Create a database: `createdb sso_bridge`
3. Update `DATABASE_URL` in `.env.local`
4. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  # Change from "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
5. Run migrations: `bun run db:push`

### 3. Redis Configuration (Optional)

Redis is **not required** for the system to work. It's used only for performance optimization.

#### Without Redis (Current Setup)
```bash
# Simply don't set REDIS_URL or set it to an invalid value
# The system will automatically fall back to database-only mode
```

#### With Redis (Optional)
```bash
# In .env.local
REDIS_URL="redis://localhost:6379"

# With password
REDIS_URL="redis://:password@localhost:6379"

# With specific database
REDIS_URL="redis://localhost:6379/0"
```

**To enable Redis**:
1. Install and start Redis
2. Set `REDIS_URL` in `.env.local`
3. The system will automatically use Redis for session caching
4. If Redis is unavailable, it will gracefully fall back to database-only mode

### 4. Directory Paths

#### Database Directory
```bash
# Relative path from project root
DATABASE_URL="file:./db/sso.db"

# Absolute path (alternative)
DATABASE_URL="file:/absolute/path/to/database/sso.db"
```

#### Logs Directory
```
/home/z/my-project/logs/              # Admin dashboard logs
/home/z/my-project/mini-services/sso-backend/logs/  # Backend logs
```

### 5. Environment-Specific Configuration

#### Development
```bash
NODE_ENV=development
ADMIN_PORT=3000
BACKEND_PORT=3001
DATABASE_URL="file:./db/sso.db"
CORS_ORIGIN="*"
```

#### Production
```bash
NODE_ENV=production
ADMIN_PORT=80
BACKEND_PORT=8080
DATABASE_URL="postgresql://user:pass@host:5432/sso_bridge"
REDIS_URL="redis://localhost:6379"
CORS_ORIGIN="https://yourdomain.com,https://app.yourdomain.com"
JWT_SECRET="your-production-secret-key"
ENCRYPTION_KEY="32-char-production-encryption-key"
```

## Complete Configuration File

See `.env.example` for a complete list of all configuration options.

## Changing Ports

### Method 1: Via Environment Variables (Recommended)

1. Edit `.env.local`:
   ```bash
   ADMIN_PORT=4000
   BACKEND_PORT=4001
   ```

2. Update `SSO_CALLBACK_URL` to match the new backend port:
   ```bash
   SSO_CALLBACK_URL="http://localhost:4001/api/v1/auth/callback"
   ```

3. Update `NEXT_PUBLIC_API_URL`:
   ```bash
   NEXT_PUBLIC_API_URL="http://localhost:4001"
   ```

4. Restart services

### Method 2: Via Command Line

```bash
# Start admin dashboard on custom port
ADMIN_PORT=4000 bun run dev

# Start backend on custom port
PORT=4001 bun run dev
```

## Database and Redis Monitoring

### Check Database Connection
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "service": "sso-backend",
  "checks": {
    "redis": "error",      // "error" if Redis not connected (OK)
    "database": "ok"       // Should always be "ok"
  }
}
```

### Check Which Database is Being Used

Look at the health check response:
- **SQLite**: Will show `database: "ok"` even without PostgreSQL
- **PostgreSQL**: Same, but you can verify by checking `prisma/schema.prisma`

## Connecting Dashboard to Backend

Currently, the dashboard uses mock data. To connect it to the backend:

1. Ensure backend is running on the correct port
2. Verify `NEXT_PUBLIC_API_URL` in `.env.local` points to backend
3. Update dashboard components to use the API functions from `src/lib/api.ts`
4. Handle loading states and errors appropriately

## Performance Comparison

### Without Redis (Current)
- Session storage: SQLite only
- Performance: Good for development
- Use case: Development, testing, low-traffic deployments

### With Redis (Optional)
- Session storage: Redis (primary) + SQLite (backup)
- Performance: Excellent for high-traffic scenarios
- Use case: Production, high-traffic deployments
- Benefit: ~10x faster session operations

## Troubleshooting

### Port Already in Use
```bash
# Find process using the port
lsof -i :3000  # or netstat -tlnp | grep 3000

# Kill the process
kill -9 <PID>
```

### Database Connection Issues
```bash
# Check database file exists
ls -la ./db/sso.db

# For PostgreSQL, test connection
psql postgresql://user:pass@localhost:5432/sso_bridge
```

### Redis Connection Issues
```bash
# Test Redis connection
redis-cli ping

# Should respond with: PONG
```

If Redis is not available, the system will automatically fall back to database-only mode and continue working.

## Summary

✅ **Database**: SQLite (configured, working)
⚠️ **Redis**: Not connected (optional, system works without it)
❌ **Dashboard-Backend**: Not connected (using mock data)

To fully connect the system:
1. Keep SQLite or switch to PostgreSQL
2. Optionally add Redis for performance
3. Connect dashboard to backend API using `src/lib/api.ts`
