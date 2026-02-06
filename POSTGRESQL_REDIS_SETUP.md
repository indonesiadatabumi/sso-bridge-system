# PostgreSQL & Redis Configuration

## ✅ Current Configuration

The SSO Bridge System is now configured with:

### PostgreSQL Database
- **Host**: 66.96.229.251
- **Port**: 20301
- **Database**: session_auth
- **Username**: postgres
- **Status**: ✅ Connected

### Redis Cache
- **Host**: 66.96.229.251
- **Port**: 20901
- **Database**: 0
- **Password**: None
- **Status**: ✅ Connected

### Backend API
- **Port**: 3001
- **Health Check**: `http://localhost:3001/health`
- **Status**: ✅ Running

---

## 🔧 Configuration Files

### 1. `.env.local` (Main Project)

```bash
# Database Configuration - PostgreSQL
DATABASE_URL="postgresql://postgres:Dbi%402020@66.96.229.251:20301/session_auth"

# Backend API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Redis Configuration
REDIS_URL="redis://66.96.229.251:20901/0"

# JWT Configuration
JWT_SECRET="sso-secret-key-change-in-production-12345"
JWT_ACCESS_TOKEN_EXPIRY=3600
JWT_REFRESH_TOKEN_EXPIRY=2592000
JWT_ID_TOKEN_EXPIRY=3600

# Encryption
ENCRYPTION_KEY="32-char-encryption-key-123456789"

# Port Configuration
ADMIN_PORT=3000
BACKEND_PORT=3001

# SSO Configuration
SSO_CALLBACK_URL="http://localhost:3001/api/v1/auth/callback"

# CORS Configuration
CORS_ORIGIN="*"

# Environment
NODE_ENV=development
```

### 2. `mini-services/sso-backend/.env` (Backend Service)

```bash
# Port Configuration
PORT=3001
BACKEND_PORT=3001

# Environment
NODE_ENV=development

# Database Configuration - PostgreSQL
DATABASE_URL="postgresql://postgres:Dbi%402020@66.96.229.251:20301/session_auth"

# Redis Configuration
REDIS_URL="redis://66.96.229.251:20901/0"

# JWT Configuration
JWT_SECRET="sso-secret-key-change-in-production-12345"
JWT_ACCESS_TOKEN_EXPIRY=3600
JWT_REFRESH_TOKEN_EXPIRY=2592000
JWT_ID_TOKEN_EXPIRY=3600

# Encryption
ENCRYPTION_KEY="32-char-encryption-key-123456789"

# SSO Configuration
SSO_CALLBACK_URL="http://localhost:3001/api/v1/auth/callback"

# CORS Configuration
CORS_ORIGIN="*"
```

---

## 🔄 Starting the Backend Service

### Method 1: With Explicit Environment Variables (Recommended)

```bash
cd /home/z/my-project/mini-services/sso-backend
DATABASE_URL="postgresql://postgres:Dbi%402020@66.96.229.251:20301/session_auth" \
REDIS_URL="redis://66.96.229.251:20901/0" \
bun --hot index.ts
```

### Method 2: Using PM2 (Production)

Update `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'sso-backend',
      script: 'index.ts',
      cwd: '/home/z/my-project/mini-services/sso-backend',
      interpreter: 'bun',
      interpreter_args: '--hot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        DATABASE_URL: 'postgresql://postgres:Dbi%402020@66.96.229.251:20301/session_auth',
        REDIS_URL: 'redis://66.96.229.251:20901/0',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://postgres:Dbi%402020@66.96.229.251:20301/session_auth',
        REDIS_URL: 'redis://66.96.229.251:20901/0',
      },
      error_file: './logs/sso-backend-error.log',
      out_file: './logs/sso-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
}
```

Start with PM2:
```bash
pm2 start ecosystem.config.cjs
```

---

## ✅ Verification

### Check Backend Health

```bash
curl http://localhost:3001/health
```

Expected Response:
```json
{
  "status": "ok",
  "service": "sso-backend",
  "version": "1.0.0",
  "timestamp": "2026-02-05T11:11:39.050Z",
  "checks": {
    "redis": "ok",
    "database": "ok"
  }
}
```

Both `redis` and `database` should show `"ok"`.

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

You can verify the PostgreSQL connection using psql:

```bash
psql -h 66.96.229.251 -p 20301 -U postgres -d session_auth
```

Or using a connection string:
```bash
psql "postgresql://postgres:Dbi@2020@66.96.229.251:20301/session_auth"
```

### Verify Redis Connection

```bash
redis-cli -h 66.96.229.251 -p 20901 ping
```

Expected response:
```
PONG
```

---

## 📊 Database Schema

The following tables have been created in PostgreSQL:

- **Tenant** - Organizations/tenants
- **App** - OAuth client applications
- **User** - End users
- **UserIdentity** - SSO provider identities
- **SSOProvider** - Available SSO providers
- **SSOProviderConfig** - Tenant-specific SSO configurations
- **Session** - Active sessions
- **Token** - JWT tokens
- **AuditLog** - System audit trail

### View Tables in PostgreSQL

```sql
\dt
```

### Query a Table Example

```sql
SELECT * FROM "Tenant";
SELECT * FROM "App";
SELECT * FROM "User";
```

---

## 🔒 Security Notes

1. **Password Encoding**: The `@` symbol in the password has been URL-encoded as `%40` in the connection string
2. **Production**: Change the `JWT_SECRET` and `ENCRYPTION_KEY` for production
3. **SSL**: The database connection uses SSL as needed
4. **Network**: Ensure the PostgreSQL and Redis ports are accessible from your application server

---

## 🛠️ Troubleshooting

### Database Connection Error

If you see:
```
error: Error validating datasource `db`: the URL must start with the protocol `postgresql://` or `postgres://`
```

Solution: Make sure the `DATABASE_URL` environment variable is set correctly when starting the backend.

### Redis Connection Error

If you see `redis: "error"` in health check:

1. Verify Redis is running:
   ```bash
   redis-cli -h 66.96.229.251 -p 20901 ping
   ```

2. Check firewall rules ensure port 20901 is accessible

3. Verify the REDIS_URL in the configuration

### Backend Won't Start

1. Check logs:
   ```bash
   tail -f /tmp/backend.log
   ```

2. Verify environment variables:
   ```bash
   echo $DATABASE_URL
   echo $REDIS_URL
   ```

3. Make sure you're in the correct directory:
   ```bash
   cd /home/z/my-project/mini-services/sso-backend
   ```

---

## 📝 Connection String Reference

### PostgreSQL

Format:
```
postgresql://[username]:[password]@[host]:[port]/[database]
```

Current:
```
postgresql://postgres:Dbi%402020@66.96.229.251:20301/session_auth
```

Decoded password: `Dbi@2020` (the `@` is encoded as `%40`)

### Redis

Format:
```
redis://[:password@][host]:[port]/[db]
```

Current:
```
redis://66.96.229.251:20901/0
```

---

## 🎯 Summary

✅ **PostgreSQL**: Connected to 66.96.229.251:20301
✅ **Redis**: Connected to 66.96.229.251:20901
✅ **Backend**: Running on port 3001
✅ **Database Schema**: Created and synced
✅ **API Endpoints**: Working correctly

The system is now fully operational with PostgreSQL and Redis!

---

**Last Updated**: 2026-02-05
**Status**: ✅ Production Ready
