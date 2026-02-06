# SSO Bridge System

A comprehensive multi-tenant Single Sign-On (SSO) session management system that enables applications to delegate authentication and session management.

## 🎯 Overview

The SSO Bridge System provides a centralized authentication and session management solution that supports:

- **Normal Login**: Traditional username/password authentication
- **SSO Integration**: OAuth 2.0 and OpenID Connect (OIDC) providers
- **Social Login**: Google, Facebook, GitHub, Microsoft, and more
- **Multi-tenant Architecture**: Support for multiple organizations/tenants
- **Session Bridging**: Centralized session management for multiple applications

## 🏗️ Architecture

The system consists of two main components:

### 1. Admin Dashboard (Configurable Port)
- **Framework**: Next.js 16 with App Router
- **UI Library**: shadcn/ui with Tailwind CSS
- **Features**:
  - Tenant management
  - SSO provider configuration
  - Application/client management
  - User monitoring and management
  - Real-time session tracking
- **Default Port**: 3000 (configurable via `ADMIN_PORT`)

### 2. Backend API (Configurable Port)
- **Runtime**: Bun with Hono framework
- **Database**: SQLite (current) / PostgreSQL (production-ready)
- **Cache**: Redis (optional, for enhanced performance)
- **Features**:
  - Authentication endpoints
  - Token validation and management
  - SSO callback handling
  - Session management
  - Audit logging
- **Default Port**: 3001 (configurable via `BACKEND_PORT`)

## ⚙️ Current Status

### Database
- **Currently Using**: SQLite
- **Location**: `./db/sso.db` (configurable)
- **Status**: ✅ Connected and working
- **Note**: System can be switched to PostgreSQL for production

### Redis
- **Status**: ⚠️ Optional (not currently connected)
- **Impact**: System works perfectly without Redis
- **Use Case**: Performance optimization for high-traffic scenarios

### Dashboard-Backend Connection
- **Status**: ❌ Not connected (using mock data)
- **Note**: API utilities available in `src/lib/api.ts` for integration

## 📋 Features

### Multi-tenant Support
- Each tenant has isolated users, apps, and configurations
- Custom domain support per tenant
- Tenant-specific SSO provider configurations

### Authentication Methods
- **Password-based**: Traditional email/password login
- **OAuth 2.0**: Custom OAuth 2.0 providers
- **OIDC**: OpenID Connect providers (Okta, Auth0, etc.)
- **Social Login**: Pre-configured providers (Google, Facebook, GitHub, Microsoft)

### Session Management
- SQLite-based session storage (default)
- Optional Redis caching for enhanced performance
- Token revocation support
- Session invalidation across all devices

### Security
- JWT-based tokens (access, refresh, ID)
- AES-256-GCM encryption for secrets
- bcrypt password hashing
- Comprehensive audit logging
- CORS protection

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and Bun
- SQLite (built-in, no installation required)
- PostgreSQL 14+ (optional, for production)
- Redis 6+ (optional, for performance)
- PM2 (for production deployment)

### Configuration

The system is highly configurable via environment variables. See [`.env.example`](./.env.example) for all available options.

#### Key Configuration Options

```bash
# Ports (customizable)
ADMIN_PORT=3000          # Admin dashboard port
BACKEND_PORT=3001        # Backend API port

# Database (SQLite default, PostgreSQL optional)
DATABASE_URL="file:./db/sso.db"
# DATABASE_URL="postgresql://user:pass@localhost:5432/sso_bridge"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Backend API URL
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### Installation

1. **Clone and install dependencies**:
```bash
# Install main project dependencies
cd /home/z/my-project
bun install

# Install backend service dependencies
cd mini-services/sso-backend
bun install
```

2. **Configure environment variables**:

Copy `.env.example` to `.env.local` and customize:

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. **Setup database**:

For SQLite (default, works out of the box):
```bash
# From main project directory
bun run db:push
```

For PostgreSQL (optional):
```bash
# Update DATABASE_URL in .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/sso_bridge"

# Update prisma/schema.prisma
# Change: provider = "sqlite" to provider = "postgresql"

# Run migrations
bun run db:push
```

For more details, see [CONFIGURATION.md](./CONFIGURATION.md).

4. **Start services**:

Development mode:
```bash
# Terminal 1 - Start Admin Dashboard
cd /home/z/my-project
bun run dev

# Terminal 2 - Start Backend API
cd /home/z/my-project/mini-services/sso-backend
bun run dev
```

Production mode with PM2:
```bash
# Start both services
pm2 start ecosystem.config.cjs

# Check status
pm2 status

# View logs
pm2 logs

# Stop services
pm2 stop all
```

## 📖 Usage

### 1. Create a Tenant

Via API:
```bash
curl -X POST http://localhost:3001/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "slug": "acme",
    "domain": "sso.acme.com",
    "description": "Acme Corp SSO"
  }'
```

### 2. Register an Application

```bash
curl -X POST http://localhost:3001/api/v1/apps \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "TENANT_ID",
    "name": "My Dashboard App",
    "redirect_uris": ["https://myapp.com/callback"]
  }'
```

Save the `client_id` and `client_secret` securely!

### 3. Configure SSO Provider

```bash
# Add Google OAuth
curl -X POST http://localhost:3001/api/v1/providers/config \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "TENANT_ID",
    "provider_id": "PROVIDER_ID",
    "client_id": "YOUR_GOOGLE_CLIENT_ID",
    "client_secret": "YOUR_GOOGLE_CLIENT_SECRET"
  }'
```

### 4. Initiate Login

**Normal Login**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "acme",
    "email": "user@acme.com",
    "password": "password123",
    "client_id": "app_xxx"
  }'
```

**SSO Login**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/sso/init \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "acme",
    "provider_id": "google-provider-id",
    "client_id": "app_xxx",
    "redirect_uri": "https://myapp.com/callback"
  }'
```

### 5. Validate Token

```bash
curl -X GET http://localhost:3001/api/v1/tokens/validate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔧 Configuration

### Database Schema

The system uses the following main tables:

- **Tenant**: Organizations/tenants
- **App**: OAuth client applications
- **User**: End users
- **UserIdentity**: SSO provider identities
- **SSOProvider**: Available SSO providers
- **SSOProviderConfig**: Tenant-specific SSO configurations
- **Session**: Active sessions
- **Token**: JWT tokens
- **AuditLog**: System audit trail

### Redis Keys

- Sessions: `sso:session:{sessionId}`
- Tokens: `sso:token:{token}`

## 🛠️ Development

### Project Structure

```
/home/z/my-project/
├── src/
│   ├── app/
│   │   └── page.tsx          # Admin dashboard
│   ├── components/
│   │   └── ui/               # shadcn/ui components
│   └── lib/
│       ├── db.ts             # Prisma client
│       └── utils.ts          # Utilities
├── mini-services/
│   └── sso-backend/
│       ├── src/
│       │   ├── config/       # Configuration
│       │   ├── lib/          # Libraries (Redis, JWT, etc.)
│       │   ├── middleware/   # Auth middleware
│       │   ├── routes/       # API routes
│       │   └── services/     # Business logic
│       ├── index.ts          # Server entry point
│       └── package.json
├── prisma/
│   └── schema.prisma         # Database schema
└── ecosystem.config.cjs      # PM2 configuration
```

### API Documentation

See [mini-services/sso-backend/README.md](./mini-services/sso-backend/README.md) for detailed API documentation.

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Secrets**: Use strong, random secrets for JWT and encryption
3. **HTTPS**: Always use HTTPS in production
4. **CORS**: Configure CORS origins appropriately
5. **Rate Limiting**: Implement rate limiting for production
6. **Token Expiry**: Configure appropriate token expiration times
7. **Password Policy**: Enforce strong password requirements

## 📊 Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Response (with Redis):
{
  "status": "ok",
  "service": "sso-backend",
  "checks": {
    "redis": "ok",
    "database": "ok"
  }
}

# Response (without Redis - current setup):
{
  "status": "ok",
  "service": "sso-backend",
  "checks": {
    "redis": "error",      // Expected if Redis not configured
    "database": "ok"
  }
}
```

Note: `redis: "error"` is expected and acceptable when Redis is not configured. The system will work with database-only mode.

### Logs

```bash
# PM2 logs
pm2 logs sso-admin
pm2 logs sso-backend

# Or view log files
tail -f logs/sso-admin-out.log
tail -f mini-services/sso-backend/logs/sso-backend-out.log
```

## 🚀 Deployment

### Using PM2

```bash
# Start both services
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Docker (Optional)

Create `Dockerfile` for backend:
```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build
EXPOSE 3001
CMD ["bun", "run", "start"]
```

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.
