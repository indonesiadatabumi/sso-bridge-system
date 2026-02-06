# SSO Bridge Backend API

Multi-tenant SSO session management backend service with support for normal login, OAuth 2.0, OIDC, and social media authentication.

## Features

- **Multi-tenant Architecture**: Support for multiple organizations/tenants
- **Multiple Authentication Methods**:
  - Username/password login
  - OAuth 2.0 / OpenID Connect
  - Social login (Google, Facebook, GitHub, Microsoft, etc.)
- **Session Management**: Redis-backed session storage with PostgreSQL backup
- **Token Management**: JWT access, refresh, and ID tokens
- **App Registration**: OAuth 2.0 client application management
- **Audit Logging**: Complete audit trail for all authentication events
- **Security**:
  - Encrypted client secrets and OAuth tokens
  - Token revocation support
  - Session invalidation
  - CORS protection

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: JWT (jsonwebtoken)
- **Encryption**: AES-256-GCM
- **Password Hashing**: bcryptjs
- **Validation**: Zod

## Installation

```bash
# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Configuration

Edit `.env` file:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sso_bridge?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_ACCESS_TOKEN_EXPIRY=3600
JWT_REFRESH_TOKEN_EXPIRY=2592000

# Encryption
ENCRYPTION_KEY="your-32-character-encryption-key"

# SSO Callback
SSO_CALLBACK_URL="http://localhost:3001/api/v1/auth/callback"

# CORS
CORS_ORIGIN="*"
```

## Database Setup

```bash
# Generate Prisma client
bunx prisma generate

# Push schema to database
bunx prisma db push
```

## Running the Service

### Development

```bash
bun run dev
```

### Production with PM2

```bash
# Start with PM2
pm2 start ecosystem.config.cjs

# View logs
pm2 logs sso-backend

# Restart
pm2 restart sso-backend

# Stop
pm2 stop sso-backend
```

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint

### Authentication
- `POST /api/v1/auth/login` - Normal login with email/password
- `POST /api/v1/auth/sso/init` - Initiate SSO flow
- `GET /api/v1/auth/callback` - SSO callback handler
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Tokens
- `GET /api/v1/tokens/validate` - Validate JWT token
- `GET /api/v1/tokens/info` - Get token information
- `POST /api/v1/tokens/revoke` - Revoke specific token
- `POST /api/v1/tokens/revoke-all` - Revoke all user tokens

### Apps
- `GET /api/v1/apps` - List all applications
- `GET /api/v1/apps/:id` - Get application details
- `POST /api/v1/apps` - Create new application
- `PUT /api/v1/apps/:id` - Update application
- `DELETE /api/v1/apps/:id` - Delete application
- `POST /api/v1/apps/:id/regenerate-secret` - Regenerate client secret

### Tenants
- `GET /api/v1/tenants` - List all tenants
- `GET /api/v1/tenants/:id` - Get tenant details
- `GET /api/v1/tenants/slug/:slug` - Get tenant by slug
- `POST /api/v1/tenants` - Create new tenant
- `PUT /api/v1/tenants/:id` - Update tenant
- `DELETE /api/v1/tenants/:id` - Delete tenant

### SSO Providers
- `GET /api/v1/providers` - List all SSO providers
- `GET /api/v1/providers/available/:tenantSlug` - Get available providers for tenant
- `GET /api/v1/providers/:id` - Get provider details
- `POST /api/v1/providers` - Create new SSO provider
- `POST /api/v1/providers/config` - Configure provider for tenant
- `DELETE /api/v1/providers/:id` - Delete provider

## Example Usage

### Normal Login

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

### SSO Initiation

```bash
curl -X POST http://localhost:3001/api/v1/auth/sso/init \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "acme",
    "provider_id": "provider_xxx",
    "client_id": "app_xxx"
  }'
```

### Token Validation

```bash
curl -X GET http://localhost:3001/api/v1/tokens/validate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create Application

```bash
curl -X POST http://localhost:3001/api/v1/apps \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "tenant_xxx",
    "name": "My App",
    "redirect_uris": ["https://myapp.com/callback"]
  }'
```

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. Initiate Auth
       ▼
┌─────────────────────────────┐
│   SSO Bridge Backend       │
│  ┌───────────────────────┐  │
│  │   Authentication      │  │
│  │   - Login             │  │
│  │   - SSO Init          │  │
│  │   - Callback          │  │
│  └───────────┬───────────┘  │
│              │              │
│  ┌───────────▼───────────┐  │
│  │   Session Service     │  │
│  │   - Create Session    │  │
│  │   - Generate Tokens   │  │
│  │   - Validate Token    │  │
│  └───────────┬───────────┘  │
│              │              │
├──────────────┼──────────────┤
│   Redis      │  PostgreSQL  │
│  (Sessions)  │   (Data)     │
└─────────────────────────────┘
       │
       │ 2. Redirect with Code
       ▼
┌─────────────┐
│  SSO Provider│
│ (Google, etc)│
└─────────────┘
```

## Security Considerations

1. **JWT Secret**: Use a strong, random secret in production
2. **Encryption Key**: Generate a secure 32-character key
3. **HTTPS**: Always use HTTPS in production
4. **CORS**: Configure CORS origin appropriately
5. **Rate Limiting**: Implement rate limiting for production
6. **Token Expiry**: Configure appropriate token expiration times
7. **Secret Storage**: Never commit `.env` file to version control

## License

MIT
