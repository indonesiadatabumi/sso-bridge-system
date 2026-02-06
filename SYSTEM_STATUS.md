# SSO Bridge System - Current Status & Configuration

## 📊 Current System Status

### ✅ Services Running
- **Admin Dashboard**: Port 3000
- **Backend API**: Port 3001

### 🔗 Database & Redis Connection

#### PostgreSQL Database ✅
- **Status**: Connected and Working
- **Type**: PostgreSQL with Prisma ORM
- **Host**: 66.96.229.251:20301
- **Database**: session_auth
- **Username**: postgres
- **Configuration**: `.env.local` and `mini-services/sso-backend/.env`

#### Redis Cache ✅
- **Status**: Connected and Working
- **Host**: 66.96.229.251:20901
- **Database**: 0
- **Password**: None
- **Purpose**: Session caching and performance optimization

#### Dashboard-Backend Connection
- **Status**: ❌ Not Connected
- **Current Mode**: Using mock data
- **API Utilities**: Available in `src/lib/api.ts` for integration

---

## ⚙️ Customizable Configuration

### Ports
```bash
# In .env.local
ADMIN_PORT=3000          # Admin dashboard port
BACKEND_PORT=3001        # Backend API port
```

### Database Path
```bash
# PostgreSQL (current)
DATABASE_URL="postgresql://postgres:Dbi%402020@66.96.229.251:20301/session_auth"

# Alternative PostgreSQL configuration
# DATABASE_URL="postgresql://username:password@host:port/database"
```

### Redis URL
```bash
# Redis (current)
REDIS_URL="redis://66.96.229.251:20901/0"

# With password (alternative)
# REDIS_URL="redis://:password@host:port/db"
```

### API URL
```bash
# Backend API URL (used by dashboard)
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

---

## 📁 Configuration Files

### 1. `.env.local` - Main Configuration
```bash
# Database - PostgreSQL
DATABASE_URL="postgresql://postgres:Dbi%402020@66.96.229.251:20301/session_auth"

# Backend API
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Ports
ADMIN_PORT=3000
BACKEND_PORT=3001

# Redis
REDIS_URL="redis://66.96.229.251:20901/0"

# JWT
JWT_SECRET="sso-secret-key-change-in-production-12345"
JWT_ACCESS_TOKEN_EXPIRY=3600
JWT_REFRESH_TOKEN_EXPIRY=2592000
JWT_ID_TOKEN_EXPIRY=3600

# Encryption
ENCRYPTION_KEY="32-char-encryption-key-123456789"

# SSO
SSO_CALLBACK_URL="http://localhost:3001/api/v1/auth/callback"

# CORS
CORS_ORIGIN="*"

# Environment
NODE_ENV=development
```

### 2. `mini-services/sso-backend/.env` - Backend Configuration
```bash
# Port Configuration
PORT=3001
BACKEND_PORT=3001

# Environment
NODE_ENV=development

# Database - PostgreSQL
DATABASE_URL="postgresql://postgres:Dbi%402020@66.96.229.251:20301/session_auth"

# Redis
REDIS_URL="redis://66.96.229.251:20901/0"

# JWT
JWT_SECRET="sso-secret-key-change-in-production-12345"
JWT_ACCESS_TOKEN_EXPIRY=3600
JWT_REFRESH_TOKEN_EXPIRY=2592000
JWT_ID_TOKEN_EXPIRY=3600

# Encryption
ENCRYPTION_KEY="32-char-encryption-key-123456789"

# SSO
SSO_CALLBACK_URL="http://localhost:3001/api/v1/auth/callback"

# CORS
CORS_ORIGIN="*"
```

### 3. `.env.example` - Configuration Template
Complete template with all available options and comments.

---

## 🔄 How to Customize

### Change Ports
```bash
# 1. Edit .env.local
ADMIN_PORT=4000
BACKEND_PORT=4001

# 2. Update related URLs
NEXT_PUBLIC_API_URL="http://localhost:4001"
SSO_CALLBACK_URL="http://localhost:4001/api/v1/auth/callback"

# 3. Update mini-services/sso-backend/.env
PORT=4001
BACKEND_PORT=4001

# 4. Restart services
```

### Change Database Path
```bash
# 1. Edit .env.local
DATABASE_URL="file:./data/production.db"

# 2. Create directory if needed
mkdir -p ./data

# 3. Run database setup
bun run db:push
```

### Enable Redis
```bash
# 1. Ensure Redis is running
redis-cli ping  # Should respond with: PONG

# 2. Edit .env.local
REDIS_URL="redis://localhost:6379"

# 3. Restart backend
cd mini-services/sso-backend
pkill -f "bun.*index.ts"
bun run dev

# 4. Verify
curl http://localhost:3001/health
# Should show: "redis": "ok"
```

### Switch to PostgreSQL
```bash
# 1. Install and setup PostgreSQL
sudo apt-get install postgresql
createdb sso_bridge

# 2. Edit .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/sso_bridge"

# 3. Edit prisma/schema.prisma
datasource db {
  provider = "postgresql"  # Change from "sqlite"
  url      = env("DATABASE_URL")
}

# 4. Run migrations
bun run db:push
```

---

## 📖 Documentation Files

1. **`README.md`** - Main project documentation
2. **`CONFIGURATION.md`** - Detailed configuration guide
3. **`QUICK_START.md`** - Quick start and customization
4. **`.env.example`** - Configuration template

---

## 🧪 Testing the System

### Check Backend Health
```bash
curl http://localhost:3001/health
```

Expected response (with PostgreSQL and Redis):
```json
{
  "status": "ok",
  "service": "sso-backend",
  "checks": {
    "redis": "ok",       // Redis is connected
    "database": "ok"    // PostgreSQL is connected
  }
}
```

### Test API Endpoints
```bash
# List tenants
curl http://localhost:3001/api/v1/tenants

# List apps
curl http://localhost:3001/api/v1/apps

# List providers
curl http://localhost:3001/api/v1/providers
```

### Verify Database Connection

Using PostgreSQL:
```bash
# Connect to PostgreSQL
psql -h 66.96.229.251 -p 20301 -U postgres -d session_auth

# Or using connection string
psql "postgresql://postgres:Dbi@2020@66.96.229.251:20301/session_auth"

# List tables
\dt

# Query a table
SELECT * FROM "Tenant";
```

---

## 🎯 Summary

### What's Working ✅
- Ports are customizable via environment variables
- Database is PostgreSQL (connected and working)
- Redis is connected and working (session caching)
- Backend API is running and healthy
- Database schema is created and synced
- All API endpoints are functional

### What's Not Connected ❌
- Dashboard is using mock data (not connected to backend API)

### Next Steps 🚀
1. Connect dashboard to backend using `src/lib/api.ts`
2. Update configuration based on your deployment needs
3. For production, update JWT_SECRET and ENCRYPTION_KEY

---

## 🔍 Connection Diagram

```
┌─────────────────┐
│  Admin Dashboard │  Port: 3000 (configurable via ADMIN_PORT)
│  (Next.js 16)    │  Status: Running, Using Mock Data
└────────┬────────┘
         │ (not connected yet)
         ▼
┌─────────────────┐
│  Backend API     │  Port: 3001 (configurable via BACKEND_PORT)
│  (Bun + Hono)    │  Status: Running, Healthy
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌────────┐
│PostgreSQL│  │ Redis  │  Status: Both Connected ✅
│ Database│  │ Cache  │
│         │  │        │
│66.96.229.251:20301│  │66.96.229.251:20901 │
└────────┘  └────────┘
```

### Dashboard-Backend Connection (Future)
To connect the dashboard to the backend:

1. Dashboard components should use API functions from `src/lib/api.ts`
2. Handle loading states and errors
3. Display real data instead of mock data

Example:
```typescript
import { tenantAPI } from '@/lib/api'

// In a component
const { data, isLoading, error } = useQuery({
  queryKey: ['tenants'],
  queryFn: () => tenantAPI.list()
})
```

---

**Last Updated**: 2026-02-05
**System Version**: 1.0.0
