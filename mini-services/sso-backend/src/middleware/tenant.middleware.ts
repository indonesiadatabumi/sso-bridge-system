import { Context, Next } from 'hono'
import { db } from '../lib/prisma.js'

export async function requireTenant(c: Context, next: Next) {
  const tenantSlug = c.req.header('X-Tenant-Slug') || c.req.query('tenant_slug')

  if (!tenantSlug) {
    return c.json(
      {
        success: false,
        error: 'Bad Request',
        message: 'Tenant identifier required',
      },
      400
    )
  }

  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
  })

  if (!tenant) {
    return c.json(
      {
        success: false,
        error: 'Not Found',
        message: 'Tenant not found',
      },
      404
    )
  }

  if (!tenant.isActive) {
    return c.json(
      {
        success: false,
        error: 'Forbidden',
        message: 'Tenant is inactive',
      },
      403
    )
  }

  c.set('tenant', tenant)

  await next()
}

export async function validateAppClient(c: Context, next: Next) {
  const clientId = c.req.header('X-Client-ID') || c.req.query('client_id')
  const clientSecret = c.req.header('X-Client-Secret') || c.req.query('client_secret')

  if (!clientId || !clientSecret) {
    return c.json(
      {
        success: false,
        error: 'Bad Request',
        message: 'Client credentials required',
      },
      400
    )
  }

  const app = await db.app.findUnique({
    where: { clientId },
    include: {
      tenant: true,
    },
  })

  if (!app) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Invalid client credentials',
      },
      401
    )
  }

  if (!app.isActive) {
    return c.json(
      {
        success: false,
        error: 'Forbidden',
        message: 'Application is inactive',
      },
      403
    )
  }

  // Verify client secret (in production, use proper hashing comparison)
  if (app.clientSecret !== clientSecret) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Invalid client credentials',
      },
      401
    )
  }

  c.set('app', app)

  await next()
}
