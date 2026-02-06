import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../lib/prisma.js'

const tenantRoutes = new Hono()

// Schema definitions
const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  domain: z.string().optional(),
  description: z.string().optional(),
  settings: z.any().optional(),
})

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  settings: z.any().optional(),
})

// Get All Tenants
tenantRoutes.get('/', async (c) => {
  try {
    const tenants = await db.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            apps: true,
            sessions: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return c.json({
      success: true,
      tenants: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        description: tenant.description,
        isActive: tenant.isActive,
        settings: tenant.settings,
        userCount: tenant._count.users,
        appCount: tenant._count.apps,
        activeSessions: tenant._count.sessions,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get tenants error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to fetch tenants',
      },
      500
    )
  }
})

// Get Single Tenant
tenantRoutes.get('/:id', async (c) => {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: c.req.param('id') },
      include: {
        _count: {
          select: {
            users: true,
            apps: true,
            sessions: {
              where: { isActive: true },
            },
            ssoProviders: true,
          },
        },
      },
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

    return c.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        description: tenant.description,
        isActive: tenant.isActive,
        settings: tenant.settings,
        userCount: tenant._count.users,
        appCount: tenant._count.apps,
        activeSessions: tenant._count.sessions,
        ssoProviderCount: tenant._count.ssoProviders,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get tenant error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to fetch tenant',
      },
      500
    )
  }
})

// Get Tenant by Slug
tenantRoutes.get('/slug/:slug', async (c) => {
  try {
    const tenant = await db.tenant.findUnique({
      where: { slug: c.req.param('slug') },
      include: {
        _count: {
          select: {
            users: true,
            apps: true,
          },
        },
      },
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

    return c.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        description: tenant.description,
        isActive: tenant.isActive,
        userCount: tenant._count.users,
        appCount: tenant._count.apps,
        createdAt: tenant.createdAt,
      },
    })
  } catch (error) {
    console.error('Get tenant by slug error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to fetch tenant',
      },
      500
    )
  }
})

// Create Tenant
tenantRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const validated = createTenantSchema.parse(body)

    // Check if slug already exists
    const existingSlug = await db.tenant.findUnique({
      where: { slug: validated.slug },
    })

    if (existingSlug) {
      return c.json(
        {
          success: false,
          error: 'Slug already exists',
        },
        409
      )
    }

    // Check if domain already exists
    if (validated.domain) {
      const existingDomain = await db.tenant.findUnique({
        where: { domain: validated.domain },
      })

      if (existingDomain) {
        return c.json(
          {
            success: false,
            error: 'Domain already exists',
          },
          409
        )
      }
    }

    const tenant = await db.tenant.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        domain: validated.domain || null,
        description: validated.description || null,
        settings: validated.settings || null,
        isActive: true,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: 'tenant_create',
        resource: tenant.id,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
        details: { tenantName: tenant.name, tenantSlug: tenant.slug } as any,
      },
    })

    return c.json(
      {
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
          description: tenant.description,
          isActive: tenant.isActive,
          createdAt: tenant.createdAt,
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

    console.error('Create tenant error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to create tenant',
      },
      500
    )
  }
})

// Update Tenant
tenantRoutes.put('/:id', async (c) => {
  try {
    const body = await c.req.json()
    const validated = updateTenantSchema.parse(body)

    const existingTenant = await db.tenant.findUnique({
      where: { id: c.req.param('id') },
    })

    if (!existingTenant) {
      return c.json(
        {
          success: false,
          error: 'Tenant not found',
        },
        404
      )
    }

    const updateData: any = {}

    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.domain !== undefined) updateData.domain = validated.domain || null
    if (validated.description !== undefined) updateData.description = validated.description || null
    if (validated.is_active !== undefined) updateData.isActive = validated.is_active
    if (validated.settings !== undefined) updateData.settings = validated.settings

    const tenant = await db.tenant.update({
      where: { id: c.req.param('id') },
      data: updateData,
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: 'tenant_update',
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
      },
    })

    return c.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        description: tenant.description,
        isActive: tenant.isActive,
        updatedAt: tenant.updatedAt,
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

    console.error('Update tenant error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to update tenant',
      },
      500
    )
  }
})

// Delete Tenant
tenantRoutes.delete('/:id', async (c) => {
  try {
    const existingTenant = await db.tenant.findUnique({
      where: { id: c.req.param('id') },
    })

    if (!existingTenant) {
      return c.json(
        {
          success: false,
          error: 'Tenant not found',
        },
        404
      )
    }

    await db.tenant.delete({
      where: { id: c.req.param('id') },
    })

    // Create audit log (will be the last one for this tenant)
    await db.auditLog.create({
      data: {
        action: 'tenant_delete',
        resource: existingTenant.id,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
        details: { tenantName: existingTenant.name, tenantSlug: existingTenant.slug } as any,
      },
    })

    return c.json({
      success: true,
      message: 'Tenant deleted successfully',
    })
  } catch (error) {
    console.error('Delete tenant error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to delete tenant',
      },
      500
    )
  }
})

export default tenantRoutes
