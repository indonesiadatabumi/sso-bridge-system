import { v4 as uuidv4 } from 'uuid'
import { db } from './prisma.js'
import { redis } from './redis.js'
import { jwtService, JWTPayload } from './jwt.js'
import { config } from '../config/index.js'

export interface SessionData {
  sessionId: string
  tenantId: string
  userId: string
  appId?: string
  ipAddress?: string
  userAgent?: string
  deviceInfo?: any
  location?: any
  createdAt: Date
  expiresAt: Date
  lastActive: Date
}

export class SessionService {
  async createSession(data: {
    tenantId: string
    userId: string
    appId?: string
    ipAddress?: string
    userAgent?: string
    deviceInfo?: any
    location?: any
  }): Promise<SessionData> {
    const sessionId = uuidv4()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + config.jwt.accessTokenExpiry * 1000)

    const sessionData: SessionData = {
      sessionId,
      tenantId: data.tenantId,
      userId: data.userId,
      appId: data.appId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      deviceInfo: data.deviceInfo,
      location: data.location,
      createdAt: now,
      expiresAt,
      lastActive: now,
    }

    // Store in Redis
    await redis.setSession(sessionId, sessionData, config.jwt.accessTokenExpiry)

    // Store backup in PostgreSQL
    await db.session.create({
      data: {
        tenantId: sessionData.tenantId,
        userId: sessionData.userId,
        appId: sessionData.appId,
        sessionId: sessionData.sessionId,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        deviceInfo: sessionData.deviceInfo,
        location: sessionData.location,
        expiresAt: sessionData.expiresAt,
        isActive: true,
      },
    })

    return sessionData
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    // Try Redis first
    let session = await redis.getSession(sessionId)

    if (!session) {
      // Fallback to PostgreSQL
      const dbSession = await db.session.findUnique({
        where: { sessionId },
      })

      if (dbSession && dbSession.isActive && dbSession.expiresAt > new Date()) {
        session = {
          sessionId: dbSession.sessionId,
          tenantId: dbSession.tenantId,
          userId: dbSession.userId,
          appId: dbSession.appId || undefined,
          ipAddress: dbSession.ipAddress || undefined,
          userAgent: dbSession.userAgent || undefined,
          deviceInfo: dbSession.deviceInfo,
          location: dbSession.location,
          createdAt: dbSession.createdAt,
          expiresAt: dbSession.expiresAt,
          lastActive: dbSession.lastActive,
        }

        // Restore to Redis
        const ttl = Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000)
        if (ttl > 0) {
          await redis.setSession(sessionId, session, ttl)
        }
      }
    }

    return session
  }

  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    await redis.updateSession(sessionId, updates)

    await db.session.update({
      where: { sessionId },
      data: {
        ...updates,
        lastActive: new Date(),
      },
    })
  }

  async deleteSession(sessionId: string): Promise<void> {
    await redis.deleteSession(sessionId)

    await db.session.update({
      where: { sessionId },
      data: { isActive: false },
    })
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const sessions = await db.session.findMany({
      where: { userId, isActive: true },
    })

    for (const session of sessions) {
      await redis.deleteSession(session.sessionId)
    }

    await db.session.updateMany({
      where: { userId },
      data: { isActive: false },
    })
  }

  async createTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>, sessionId: string) {
    const accessToken = jwtService.generateAccessToken({
      ...payload,
      sessionId,
    })

    const refreshToken = jwtService.generateRefreshToken({
      ...payload,
      sessionId,
    })

    const idToken = jwtService.generateIdToken({
      ...payload,
      sessionId,
    })

    // Store tokens in Redis
    await redis.setToken(accessToken, { ...payload, sessionId, type: 'access' }, config.jwt.accessTokenExpiry)
    await redis.setToken(refreshToken, { ...payload, sessionId, type: 'refresh' }, config.jwt.refreshTokenExpiry)

    return {
      accessToken,
      refreshToken,
      idToken,
      expiresIn: config.jwt.accessTokenExpiry,
      tokenType: 'Bearer',
    }
  }

  async validateToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = jwtService.verifyToken(token)

      // Check if token exists in Redis
      const tokenData = await redis.getToken(token)
      if (!tokenData) {
        return null
      }

      // Check session
      const session = await this.getSession(payload.sessionId)
      if (!session) {
        return null
      }

      return payload
    } catch (error) {
      return null
    }
  }

  async refreshTokens(refreshToken: string): Promise<any> {
    try {
      const payload = jwtService.verifyToken(refreshToken)

      // Check if refresh token exists in Redis
      const tokenData = await redis.getToken(refreshToken)
      if (!tokenData || tokenData.type !== 'refresh') {
        throw new Error('Invalid refresh token')
      }

      // Check session
      const session = await this.getSession(payload.sessionId)
      if (!session) {
        throw new Error('Session expired')
      }

      // Generate new tokens
      const tokens = await this.createTokens(
        {
          userId: payload.userId,
          tenantId: payload.tenantId,
          appId: payload.appId,
          email: payload.email,
          name: payload.name,
        },
        payload.sessionId
      )

      // Revoke old refresh token
      await redis.deleteToken(refreshToken)

      return tokens
    } catch (error) {
      throw new Error('Invalid refresh token')
    }
  }
}

export const sessionService = new SessionService()
