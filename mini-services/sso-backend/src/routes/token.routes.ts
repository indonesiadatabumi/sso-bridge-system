import { Hono } from 'hono'
import { sessionService } from '../lib/session.js'
import { db } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const tokenRoutes = new Hono()

// Validate Token
tokenRoutes.get('/validate', async (c) => {
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

    if (!payload) {
      return c.json(
        {
          success: false,
          valid: false,
          error: 'Invalid token',
        },
        401
      )
    }

    // Get user details
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: {
        tenant: true,
      },
    })

    if (!user || !user.isActive) {
      return c.json(
        {
          success: false,
          valid: false,
          error: 'User not found or inactive',
        },
        401
      )
    }

    return c.json({
      success: true,
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
        },
      },
      session: {
        sessionId: payload.sessionId,
        appId: payload.appId,
      },
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return c.json(
      {
        success: false,
        valid: false,
        error: 'Validation failed',
      },
      500
    )
  }
})

// Get Token Info (requires valid token)
tokenRoutes.get('/info', requireAuth, async (c) => {
  try {
    const user = c.get('user')

    // Get session details
    const session = await sessionService.getSession(user.sessionId)

    return c.json({
      success: true,
      token: {
        userId: user.userId,
        tenantId: user.tenantId,
        appId: user.appId,
        email: user.email,
        name: user.name,
        sessionId: user.sessionId,
        issuedAt: user.iat,
        expiresAt: user.exp,
      },
      session,
    })
  } catch (error) {
    console.error('Token info error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to get token info',
      },
      500
    )
  }
})

// Revoke Token
tokenRoutes.post('/revoke', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const token = c.get('token')

    // Delete token from Redis
    await sessionService.deleteToken(token)

    // Mark as revoked in database
    const hashedToken = Buffer.from(token).toString('base64')
    await db.token.updateMany({
      where: {
        userId: user.userId,
        token: hashedToken,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.userId,
        appId: user.appId,
        action: 'token_revoke',
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
      },
    })

    return c.json({
      success: true,
      message: 'Token revoked successfully',
    })
  } catch (error) {
    console.error('Token revoke error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to revoke token',
      },
      500
    )
  }
})

// Revoke All User Tokens
tokenRoutes.post('/revoke-all', requireAuth, async (c) => {
  try {
    const user = c.get('user')

    // Delete all user tokens from Redis
    await sessionService.deleteAllUserSessions(user.userId)

    // Mark all tokens as revoked in database
    await db.token.updateMany({
      where: {
        userId: user.userId,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.userId,
        appId: user.appId,
        action: 'token_revoke_all',
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
        success: true,
      },
    })

    return c.json({
      success: true,
      message: 'All tokens revoked successfully',
    })
  } catch (error) {
    console.error('Revoke all tokens error:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to revoke all tokens',
      },
      500
    )
  }
})

export default tokenRoutes
