import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { config } from './src/config/index.js'
import { redis } from './src/lib/redis.js'
import { db } from './src/lib/prisma.js'

// Import routes
import authRoutes from './src/routes/auth.routes.js'
import tokenRoutes from './src/routes/token.routes.js'
import appRoutes from './src/routes/app.routes.js'
import tenantRoutes from './src/routes/tenant.routes.js'
import providerRoutes from './src/routes/provider.routes.js'

// Create Hono app
const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: config.corsOrigin,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug', 'X-Client-ID', 'X-Client-Secret'],
}))

// Health check endpoint
app.get('/health', async (c) => {
  const redisHealth = await redis.healthCheck()

  let dbHealth = false
  try {
    await db.$queryRaw`SELECT 1`
    dbHealth = true
  } catch (error) {
    dbHealth = false
  }

  return c.json({
    status: 'ok',
    service: 'sso-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    checks: {
      redis: redisHealth ? 'ok' : 'error',
      database: dbHealth ? 'ok' : 'error',
    },
  })
})

// API Routes
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/tokens', tokenRoutes)
app.route('/api/v1/apps', appRoutes)
app.route('/api/v1/tenants', tenantRoutes)
app.route('/api/v1/providers', providerRoutes)

// Root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'SSO Bridge Backend API',
    version: '1.0.0',
    documentation: '/api/v1',
    endpoints: {
      auth: '/api/v1/auth',
      tokens: '/api/v1/tokens',
      apps: '/api/v1/apps',
      tenants: '/api/v1/tenants',
      providers: '/api/v1/providers',
      health: '/health',
    },
  })
})

// API info endpoint
app.get('/api/v1', (c) => {
  return c.json({
    version: '1.0.0',
    endpoints: {
      authentication: {
        login: 'POST /api/v1/auth/login',
        ssoInit: 'POST /api/v1/auth/sso/init',
        ssoCallback: 'GET /api/v1/auth/callback',
        refreshToken: 'POST /api/v1/auth/refresh',
        logout: 'POST /api/v1/auth/logout',
      },
      tokens: {
        validate: 'GET /api/v1/tokens/validate',
        info: 'GET /api/v1/tokens/info',
        revoke: 'POST /api/v1/tokens/revoke',
        revokeAll: 'POST /api/v1/tokens/revoke-all',
      },
      apps: {
        list: 'GET /api/v1/apps',
        get: 'GET /api/v1/apps/:id',
        create: 'POST /api/v1/apps',
        update: 'PUT /api/v1/apps/:id',
        delete: 'DELETE /api/v1/apps/:id',
        regenerateSecret: 'POST /api/v1/apps/:id/regenerate-secret',
      },
      tenants: {
        list: 'GET /api/v1/tenants',
        get: 'GET /api/v1/tenants/:id',
        getBySlug: 'GET /api/v1/tenants/slug/:slug',
        create: 'POST /api/v1/tenants',
        update: 'PUT /api/v1/tenants/:id',
        delete: 'DELETE /api/v1/tenants/:id',
      },
      providers: {
        list: 'GET /api/v1/providers',
        getAvailable: 'GET /api/v1/providers/available/:tenantSlug',
        get: 'GET /api/v1/providers/:id',
        create: 'POST /api/v1/providers',
        createConfig: 'POST /api/v1/providers/config',
        delete: 'DELETE /api/v1/providers/:id',
      },
    },
  })
})

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Not Found',
      message: 'The requested resource was not found',
    },
    404
  )
})

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json(
    {
      success: false,
      error: 'Internal Server Error',
      message: config.nodeEnv === 'development' ? err.message : 'An error occurred',
    },
    500
  )
})

// Start server
async function start() {
  try {
    // Connect to Redis (optional, system will work without Redis)
    try {
      await redis.connect()
      console.log('✓ Redis connected')
    } catch (error) {
      console.warn('⚠ Redis connection failed, system will work with database only:', error)
    }

    // Test database connection
    await db.$connect()
    console.log('✓ Database connected')

    // Start server
    const server = Bun.serve({
      port: config.port,
      fetch: app.fetch,
    })

    console.log(`\n╔════════════════════════════════════════════════════════════╗`)
    console.log(`║  SSO Bridge Backend API                              ║`)
    console.log(`║                                                          ║`)
    console.log(`║  ✓ Environment: ${config.nodeEnv.padEnd(36)}║`)
    console.log(`║  ✓ Port: ${config.port.toString().padEnd(42)}║`)
    console.log(`║  ✓ URL: http://localhost:${config.port}${' '.padEnd(29)}║`)
    console.log(`╚════════════════════════════════════════════════════════════╝\n`)
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
