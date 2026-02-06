import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../lib/prisma.js'
import { passwordService } from '../lib/password.js'
import { cryptoService } from '../lib/crypto.js'
import { requireAuth, requireAppAuth } from '../middleware/auth.middleware.js'

const appRoutes = new Hono()

// Schema definitions
const createAppSchema = z.object({
  tenant_id: z.string(),
  name: z.string().min(1),
  redirect_uris: z.array(z.string().url()),
  allowed_origins: z.array(z.string()).optional(),
  scopes: z.string().optional(),
  token_expiration: z.number().optional(),
  refresh_token_expiration: z.number().optional(),
})

const updateAppSchema = z.object({
  name: z.string().min(1).optional(),
  redirect_uris: z.array(z.string().url()).optional(),
  allowed_origins: z.array(z.string()).optional(),
  scopes: z.string().optional(),
  token_expiration: z.number().optional(),
  refresh_token_expiration: z.number().optional(),
  is_active: z.boolean().optional(),
})

// Get All Apps (Admin only - for now, all authenticated users can view)
appRoutes.get('/', async (c) => {
  try {
    const tenantSlug = c.req.query('tenant_slug')
    const clientId = c.req.query('client_id')

    const where: any = {}

    if (tenantSlug) {
      const tenant = await db.tenant.findUnique({
        where: { slug: tenantSlug },
      })
      if (tenant) {
        where.tenantId = tenant.id
      }
    }

    if (clientId) {
      where.clientId = clientId
    }

    const apps = await db.app.findMany({
      where,
      include: {
        tenant: true,
        _count: {
          select: {
            sessions: {
              where: { isActive: true },
            },
            tokens: {
              where: { isRevoked: false },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return c.json({
      success: true,
      apps: apps.map((app) => ({
        id: app.id,
        tenantId: app.tenantId,
        tenantName: app.tenant.name,
        tenantSlug: app.tenant.slug,
        name: app.name,
        clientId: app.clientId,
        redirectUris: JSON.parse(app.redirectUris),
        allowedOrigins: app.allowedOrigins ? JSON.parse(app.allowedOrigins) : [],
        scopes: app.scopes,
        grantTypes: JSON.parse(app.grantTypes),
        tokenExpiration: app.tokenExpiration,
        refreshTokenExpiration: app.refreshTokenExpiration,
        isActive: app.isActive,
        activeSessions: app._count.sessions,
        activeTokens: app._count.tokens,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get apps error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to fetch apps',
      },
      500
    )
  }
})

// Get Single App
appRoutes.get('/:id', async (c) => {
  try {
    const app = await db.app.findUnique({
      where: { id: c.req.param('id') },
      include: {
        tenant: true,
        _count: {
          select: {
            sessions: {
              where: { isActive: true },
            },
            tokens: {
              where: { isRevoked: false },
            },
          },
        },
      },
    })

    if (!app) {
      return c.json(
        {
          success: false,
          error: 'App not found',
        },
        404
      )
    }

    return c.json({
      success: true,
      app: {
        id: app.id,
        tenantId: app.tenantId,
        tenantName: app.tenant.name,
        tenantSlug: app.tenant.slug,
        name: app.name,
        clientId: app.clientId,
        redirectUris: JSON.parse(app.redirectUris),
        allowedOrigins: app.allowedOrigins ? JSON.parse(app.allowedOrigins) : [],
        scopes: app.scopes,
        grantTypes: JSON.parse(app.grantTypes),
        tokenExpiration: app.tokenExpiration,
        refreshTokenExpiration: app.refreshTokenExpiration,
        isActive: app.isActive,
        activeSessions: app._count.sessions,
        activeTokens: app._count.tokens,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get app error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to fetch app',
      },
      500
    )
  }
})

// Create App
appRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const validated = createAppSchema.parse(body)

    // Verify tenant exists
    const tenant = await db.tenant.findUnique({
      where: { id: validated.tenant_id },
    })

    if (!tenant) {
      return c.json(
        {
          success: false,
          error: 'Tenant not found',
        },
        404
      )
    }

    // Generate client ID and secret
    const clientId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const clientSecret = passwordService.generate(64)

    // Hash client secret
    const hashedSecret = await passwordService.hash(clientSecret)

    const app = await db.app.create({
      data: {
        tenantId: validated.tenant_id,
        name: validated.name,
        clientId,
        clientSecret: hashedSecret,
        redirectUris: JSON.stringify(validated.redirect_uris),
        allowedOrigins: validated.allowed_origins ? JSON.stringify(validated.allowed_origins) : null,
        scopes: validated.scopes || 'openid profile email',
        grantTypes: JSON.stringify(['authorization_code', 'refresh_token']),
        tokenExpiration: validated.token_expiration || 3600,
        refreshTokenExpiration: validated.refresh_token_expiration || 2592000,
        isActive: true,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: 'app_create',
        resource: app.id,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
        details: { appName: app.name } as any,
      },
    })

    return c.json(
      {
        success: true,
        app: {
          id: app.id,
          name: app.name,
          clientId,
          clientSecret, // Only show secret once
          redirectUris: JSON.parse(app.redirectUris),
          scopes: app.scopes,
        },
        message: 'Make sure to save the client secret securely. It will not be shown again.',
      },
      201
    )
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

    console.error('Create app error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to create app',
      },
      500
    )
  }
})

// Update App
appRoutes.put('/:id', async (c) => {
  try {
    const body = await c.req.json()
    const validated = updateAppSchema.parse(body)

    const existingApp = await db.app.findUnique({
      where: { id: c.req.param('id') },
    })

    if (!existingApp) {
      return c.json(
        {
          success: false,
          error: 'App not found',
        },
        404
      )
    }

    const updateData: any = {}

    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.redirect_uris !== undefined) updateData.redirectUris = JSON.stringify(validated.redirect_uris)
    if (validated.allowed_origins !== undefined) updateData.allowedOrigins = JSON.stringify(validated.allowed_origins)
    if (validated.scopes !== undefined) updateData.scopes = validated.scopes
    if (validated.token_expiration !== undefined) updateData.tokenExpiration = validated.token_expiration
    if (validated.refresh_token_expiration !== undefined) updateData.refreshTokenExpiration = validated.refresh_token_expiration
    if (validated.is_active !== undefined) updateData.isActive = validated.is_active

    const app = await db.app.update({
      where: { id: c.req.param('id') },
      data: updateData,
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: app.tenantId,
        appId: app.id,
        action: 'app_update',
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
      },
    })

    return c.json({
      success: true,
      app: {
        id: app.id,
        name: app.name,
        clientId: app.clientId,
        redirectUris: JSON.parse(app.redirectUris),
        scopes: app.scopes,
        isActive: app.isActive,
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

    console.error('Update app error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to update app',
      },
      500
    )
  }
})

// Delete App
appRoutes.delete('/:id', async (c) => {
  try {
    const existingApp = await db.app.findUnique({
      where: { id: c.req.param('id') },
    })

    if (!existingApp) {
      return c.json(
        {
          success: false,
          error: 'App not found',
        },
        404
      )
    }

    await db.app.delete({
      where: { id: c.req.param('id') },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: existingApp.tenantId,
        action: 'app_delete',
        resource: existingApp.id,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
        details: { appName: existingApp.name } as any,
      },
    })

    return c.json({
      success: true,
      message: 'App deleted successfully',
    })
  } catch (error) {
    console.error('Delete app error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to delete app',
      },
      500
    )
  }
})

// Regenerate Client Secret
appRoutes.post('/:id/regenerate-secret', async (c) => {
  try {
    const existingApp = await db.app.findUnique({
      where: { id: c.req.param('id') },
    })

    if (!existingApp) {
      return c.json(
        {
          success: false,
          error: 'App not found',
        },
        404
      )
    }

    // Generate new client secret
    const newClientSecret = passwordService.generate(64)
    const hashedSecret = await passwordService.hash(newClientSecret)

    await db.app.update({
      where: { id: c.req.param('id') },
      data: {
        clientSecret: hashedSecret,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: existingApp.tenantId,
        appId: existingApp.id,
        action: 'app_secret_regenerate',
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
      },
    })

    return c.json({
      success: true,
      clientSecret: newClientSecret,
      message: 'Make sure to save the new client secret securely. It will not be shown again.',
    })
  } catch (error) {
    console.error('Regenerate secret error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to regenerate client secret',
      },
      500
    )
  }
})

export default appRoutes
