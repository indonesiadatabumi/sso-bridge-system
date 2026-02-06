import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

export interface JWTPayload {
  userId: string
  tenantId: string
  appId?: string
  sessionId: string
  email: string
  name?: string
  iat?: number
  exp?: number
}

export class JWTService {
  private secret: string

  constructor() {
    this.secret = config.jwt.secret
  }

  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: config.jwt.accessTokenExpiry,
    })
  }

  generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: config.jwt.refreshTokenExpiry,
    })
  }

  generateIdToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: config.jwt.idTokenExpiry,
    })
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.secret) as JWTPayload
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }

  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload
    } catch (error) {
      return null
    }
  }
}

export const jwtService = new JWTService()
