import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../lib/prisma.js'
import { cryptoService } from '../lib/crypto.js'
import { ssoService } from '../services/sso.service.js'

const providerRoutes = new Hono()

// Schema definitions
const createProviderSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['oauth2', 'oidc', 'saml', 'social']),
  provider: z.string().min(1),
  auth_url: z.string().url(),
  token_url: z.string().url(),
  user_info_url: z.string().url().optional(),
  scopes: z.string().default('openid profile email'),
  metadata: z.any().optional(),
  is_global: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

const createProviderConfigSchema = z.object({
  tenant_id: z.string(),
  provider_id: z.string(),
  client_id: z.string(),
  client_secret: z.string(),
  scopes: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  mapping: z.any().optional(),
  is_active: z.boolean().default(true),
  priority: z.number().default(0),
})

// Get All SSO Providers
providerRoutes.get('/', async (c) => {
  try {
    const providers = await db.sSOProvider.findMany({
      include: {
        _count: {
          select: {
            tenantConfigs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return c.json({
      success: true,
      providers: providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        provider: provider.provider,
        authUrl: provider.authUrl,
        tokenUrl: provider.tokenUrl,
        userInfoUrl: provider.userInfoUrl,
        scopes: provider.scopes,
        metadata: provider.metadata,
        isActive: provider.isActive,
        isGlobal: provider.isGlobal,
        tenantCount: provider._count.tenantConfigs,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get providers error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to fetch providers',
      },
      500
    )
  }
})

// Get Providers Available for Tenant
providerRoutes.get('/available/:tenantSlug', async (c) => {
  try {
    const tenant = await db.tenant.findUnique({
      where: { slug: c.req.param('tenantSlug') },
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

    const providers = await ssoService.getAvailableProviders(tenant.id)

    return c.json({
      success: true,
      providers,
    })
  } catch (error) {
    console.error('Get available providers error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to fetch available providers',
      },
      500
    )
  }
})

// Get Single Provider
providerRoutes.get('/:id', async (c) => {
  try {
    const provider = await db.sSOProvider.findUnique({
      where: { id: c.req.param('id') },
      include: {
        tenantConfigs: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })

    if (!provider) {
      return c.json(
        {
          success: false,
          error: 'Provider not found',
        },
        404
      )
    }

    return c.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        provider: provider.provider,
        authUrl: provider.authUrl,
        tokenUrl: provider.tokenUrl,
        userInfoUrl: provider.userInfoUrl,
        scopes: provider.scopes,
        metadata: provider.metadata,
        isActive: provider.isActive,
        isGlobal: provider.isGlobal,
        tenantConfigs: provider.tenantConfigs.map((config) => ({
          id: config.id,
          tenant: config.tenant,
          clientId: config.clientId,
          scopes: config.scopes,
          isActive: config.isActive,
          priority: config.priority,
        })),
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get provider error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to fetch provider',
      },
      500
    )
  }
})

// Create Provider
providerRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const validated = createProviderSchema.parse(body)

    const provider = await db.sSOProvider.create({
      data: {
        name: validated.name,
        type: validated.type,
        provider: validated.provider,
        authUrl: validated.auth_url,
        tokenUrl: validated.token_url,
        userInfoUrl: validated.user_info_url || null,
        scopes: validated.scopes,
        metadata: validated.metadata || null,
        isActive: validated.is_active,
        isGlobal: validated.is_global,
      },
    })

    return c.json(
      {
        success: true,
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.type,
          provider: provider.provider,
          isActive: provider.isActive,
          isGlobal: provider.isGlobal,
          createdAt: provider.createdAt,
        },
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

    console.error('Create provider error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to create provider',
      },
      500
    )
  }
})

// Create Provider Config for Tenant
providerRoutes.post('/config', async (c) => {
  try {
    const body = await c.req.json()
    const validated = createProviderConfigSchema.parse(body)

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

    // Verify provider exists
    const provider = await db.sSOProvider.findUnique({
      where: { id: validated.provider_id },
    })

    if (!provider) {
      return c.json(
        {
          success: false,
          error: 'Provider not found',
        },
        404
      )
    }

    // Check if config already exists
    const existingConfig = await db.sSOProviderConfig.findUnique({
      where: {
        tenantId_providerId: {
          tenantId: validated.tenant_id,
          providerId: validated.provider_id,
        },
      },
    })

    if (existingConfig) {
      return c.json(
        {
          success: false,
          error: 'Configuration already exists for this tenant and provider',
        },
        409
      )
    }

    // Encrypt client secret
    const encrypted = cryptoService.encrypt(validated.client_secret)

    const config = await db.sSOProviderConfig.create({
      data: {
        tenantId: validated.tenant_id,
        providerId: validated.provider_id,
        clientId: validated.client_id,
        clientSecret: `${encrypted.encrypted}:${encrypted.iv}:${encrypted.authTag}`,
        scopes: validated.scopes || provider.scopes,
        redirectUri: validated.redirect_uri || null,
        mapping: validated.mapping || null,
        isActive: validated.is_active,
        priority: validated.priority,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: 'sso_provider_config_create',
        resource: provider.id,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
        details: { providerName: provider.name } as any,
      },
    })

    return c.json(
      {
        success: true,
        config: {
          id: config.id,
          tenantId: config.tenantId,
          providerId: config.providerId,
          clientId: config.clientId,
          scopes: config.scopes,
          isActive: config.isActive,
          priority: config.priority,
          createdAt: config.createdAt,
        },
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

    console.error('Create provider config error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to create provider configuration',
      },
      500
    )
  }
})

// Delete Provider
providerRoutes.delete('/:id', async (c) => {
  try {
    const existingProvider = await db.sSOProvider.findUnique({
      where: { id: c.req.param('id') },
    })

    if (!existingProvider) {
      return c.json(
        {
          success: false,
          error: 'Provider not found',
        },
        404
      )
    }

    await db.sSOProvider.delete({
      where: { id: c.req.param('id') },
    })

    return c.json({
      success: true,
      message: 'Provider deleted successfully',
    })
  } catch (error) {
    console.error('Delete provider error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to delete provider',
      },
      500
    )
  }
})

export default providerRoutes
