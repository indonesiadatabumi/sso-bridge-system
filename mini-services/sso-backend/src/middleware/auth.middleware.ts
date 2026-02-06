import { Context, Next } from 'hono'
import { sessionService } from '../lib/session.js'

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      },
      401
    )
  }

  const token = authHeader.substring(7)

  try {
    const payload = await sessionService.validateToken(token)

    if (!payload) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        },
        401
      )
    }

    // Attach user info to context
    c.set('user', payload)
    c.set('token', token)

    await next()
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Token validation failed',
      },
      401
    )
  }
}

export async function requireAppAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      },
      401
    )
  }

  const token = authHeader.substring(7)

  try {
    const payload = await sessionService.validateToken(token)

    if (!payload || !payload.appId) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid app token',
        },
        401
      )
    }

    c.set('user', payload)
    c.set('token', token)
    c.set('appId', payload.appId)

    await next()
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Token validation failed',
      },
      401
    )
  }
}
