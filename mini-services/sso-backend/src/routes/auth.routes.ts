import { Hono } from 'hono'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../lib/prisma.js'
import { sessionService } from '../lib/session.js'
import { passwordService } from '../lib/password.js'
import { cryptoService } from '../lib/crypto.js'
import { ssoService } from '../services/sso.service.js'
import { config } from '../config/index.js'

const authRoutes = new Hono()

// Schema definitions
const loginSchema = z.object({
  tenant_slug: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  client_id: z.string(),
  redirect_uri: z.string().url().optional(),
})

const refreshTokenSchema = z.object({
  refresh_token: z.string(),
})

const ssoInitSchema = z.object({
  tenant_slug: z.string(),
  provider_id: z.string(),
  client_id: z.string(),
  redirect_uri: z.string().url().optional(),
})

// Normal Login
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const validated = loginSchema.parse(body)

    // Find tenant
    const tenant = await db.tenant.findUnique({
      where: { slug: validated.tenant_slug },
    })

    if (!tenant || !tenant.isActive) {
      return c.json(
        {
          success: false,
          error: 'Invalid tenant',
          message: 'Tenant not found or inactive',
        },
        404
      )
    }

    // Find app
    const app = await db.app.findUnique({
      where: { clientId: validated.client_id },
    })

    if (!app || !app.isActive) {
      return c.json(
        {
          success: false,
          error: 'Invalid client',
          message: 'Application not found or inactive',
        },
        404
      )
    }

    // Find user
    const user = await db.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: validated.email,
        isActive: true,
      },
    })

    if (!user || !user.password) {
      return c.json(
        {
          success: false,
          error: 'Invalid credentials',
          message: 'Invalid email or password',
        },
        401
      )
    }

    // Verify password
    const isValidPassword = await passwordService.verify(validated.password, user.password)

    if (!isValidPassword) {
      return c.json(
        {
          success: false,
          error: 'Invalid credentials',
          message: 'Invalid email or password',
        },
        401
      )
    }

    // Create session
    const session = await sessionService.createSession({
      tenantId: tenant.id,
      userId: user.id,
      appId: app.id,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      userAgent: c.req.header('user-agent'),
    })

    // Generate tokens
    const tokens = await sessionService.createTokens(
      {
        userId: user.id,
        tenantId: tenant.id,
        appId: app.id,
        email: user.email,
        name: user.name || undefined,
        sessionId: session.sessionId,
      },
      session.sessionId
    )

    // Update user last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        appId: app.id,
        userId: user.id,
        action: 'login',
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
      },
    })

    // If redirect_uri provided, return URL
    if (validated.redirect_uri) {
      const callbackUrl = new URL(validated.redirect_uri)
      callbackUrl.searchParams.set('code', tokens.accessToken)
      callbackUrl.searchParams.set('state', uuidv4())

      return c.json({
        success: true,
        redirect_url: callbackUrl.toString(),
        tokens,
      })
    }

    return c.json({
      success: true,
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          message: error.errors[0].message,
        },
        400
      )
    }

    console.error('Login error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An error occurred during login',
      },
      500
    )
  }
})

// SSO Initiation
authRoutes.post('/sso/init', async (c) => {
  try {
    const body = await c.req.json()
    const validated = ssoInitSchema.parse(body)

    // Find tenant
    const tenant = await db.tenant.findUnique({
      where: { slug: validated.tenant_slug },
    })

    if (!tenant || !tenant.isActive) {
      return c.json(
        {
          success: false,
          error: 'Invalid tenant',
          message: 'Tenant not found or inactive',
        },
        404
      )
    }

    // Find app
    const app = await db.app.findUnique({
      where: { clientId: validated.client_id },
    })

    if (!app || !app.isActive) {
      return c.json(
        {
          success: false,
          error: 'Invalid client',
          message: 'Application not found or inactive',
        },
        404
      )
    }

    // Generate state
    const state = uuidv4()

    // Store state in Redis temporarily
    // (In production, you'd want to encrypt this with app info)
    await sessionService.createSession({
      tenantId: tenant.id,
      userId: '', // Will be filled after callback
      appId: app.id,
    })

    // Generate authorization URL
    const authUrl = await ssoService.generateAuthorizationUrl(
      tenant.id,
      validated.provider_id,
      state,
      validated.redirect_uri
    )

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        appId: app.id,
        action: 'sso_init',
        resource: validated.provider_id,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
      },
    })

    return c.json({
      success: true,
      auth_url: authUrl,
      state,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          message: error.errors[0].message,
        },
        400
      )
    }

    console.error('SSO init error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An error occurred during SSO initiation',
      },
      500
    )
  }
})

// SSO Callback
authRoutes.get('/callback', async (c) => {
  try {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const error = c.req.query('error')

    if (error) {
      return c.json(
        {
          success: false,
          error: 'SSO error',
          message: error,
        },
        400
      )
    }

    if (!code || !state) {
      return c.json(
        {
          success: false,
          error: 'Bad request',
          message: 'Missing code or state parameter',
        },
        400
      )
    }

    // In production, validate state and retrieve app info from Redis
    // For now, we'll use query parameters
    const tenantSlug = c.req.query('tenant_slug')
    const providerId = c.req.query('provider_id')
    const clientId = c.req.query('client_id')
    const redirectUri = c.req.query('redirect_uri')

    if (!tenantSlug || !providerId || !clientId) {
      return c.json(
        {
          success: false,
          error: 'Bad request',
          message: 'Missing required parameters',
        },
        400
      )
    }

    // Find tenant
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return c.json(
        {
          success: false,
          error: 'Invalid tenant',
          message: 'Tenant not found',
        },
        404
      )
    }

    // Find app
    const app = await db.app.findUnique({
      where: { clientId },
    })

    if (!app) {
      return c.json(
        {
          success: false,
          error: 'Invalid client',
          message: 'Application not found',
        },
        404
      )
    }

    // Exchange code for token
    const tokenResponse = await ssoService.exchangeCodeForToken(
      tenant.id,
      providerId,
      code,
      redirectUri
    )

    // Get user info
    const userInfo = await ssoService.getUserInfo(tenant.id, providerId, tokenResponse.access_token)

    // Find or create user
    const { userId, isNewUser } = await ssoService.findOrCreateUser(
      tenant.id,
      providerId,
      userInfo.id,
      userInfo,
      tokenResponse.access_token,
      tokenResponse.refresh_token
    )

    // Get user details
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found after creation')
    }

    // Create session
    const session = await sessionService.createSession({
      tenantId: tenant.id,
      userId: user.id,
      appId: app.id,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      userAgent: c.req.header('user-agent'),
    })

    // Generate tokens
    const tokens = await sessionService.createTokens(
      {
        userId: user.id,
        tenantId: tenant.id,
        appId: app.id,
        email: user.email,
        name: user.name || undefined,
        sessionId: session.sessionId,
      },
      session.sessionId
    )

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        appId: app.id,
        userId: user.id,
        action: 'sso_callback',
        resource: providerId,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
        details: {
          isNewUser,
          provider: providerId,
        } as any,
      },
    })

    // If redirect_uri provided, redirect with code
    if (redirectUri) {
      const callbackUrl = new URL(redirectUri)
      callbackUrl.searchParams.set('code', tokens.accessToken)
      callbackUrl.searchParams.set('state', state)

      return c.redirect(callbackUrl.toString())
    }

    return c.json({
      success: true,
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isNewUser,
      },
    })
  } catch (error) {
    console.error('SSO callback error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An error occurred during SSO callback',
      },
      500
    )
  }
})

// Refresh Token
authRoutes.post('/refresh', async (c) => {
  try {
    const body = await c.req.json()
    const validated = refreshTokenSchema.parse(body)

    const tokens = await sessionService.refreshTokens(validated.refresh_token)

    return c.json({
      success: true,
      tokens,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          message: error.errors[0].message,
        },
        400
      )
    }

    console.error('Refresh token error:', error)
    return c.json(
      {
        success: false,
        error: 'Invalid token',
        message: 'Failed to refresh token',
      },
      401
    )
  }
})

// Logout
authRoutes.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Missing authorization header',
        },
        401
      )
    }

    const token = authHeader.substring(7)
    const payload = await sessionService.validateToken(token)

    if (payload) {
      // Delete session
      await sessionService.deleteSession(payload.sessionId)

      // Revoke token
      await db.token.updateMany({
        where: {
          userId: payload.userId,
          tokenType: { in: ['access_token', 'refresh_token'] },
        },
        data: { isRevoked: true, revokedAt: new Date() },
      })

      // Create audit log
      await db.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.userId,
          appId: payload.appId,
          action: 'logout',
          ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
          userAgent: c.req.header('user-agent'),
          success: true,
        },
      })
    }

    return c.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return c.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An error occurred during logout',
      },
      500
    )
  }
})

export default authRoutes
