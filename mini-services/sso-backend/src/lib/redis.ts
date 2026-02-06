import Redis from 'ioredis'
import { config } from '../config/index.js'

class RedisClient {
  private client: Redis

  constructor() {
    this.client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    })

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err)
    })

    this.client.on('connect', () => {
      console.log('Redis Client Connected')
    })
  }

  async connect(): Promise<void> {
    if (!this.client.status || this.client.status === 'end') {
      await this.client.connect()
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit()
  }

  // Session Operations
  async setSession(sessionId: string, data: any, ttl: number): Promise<void> {
    const key = `${config.redisSessionPrefix}${sessionId}`
    await this.client.setex(key, ttl, JSON.stringify(data))
  }

  async getSession(sessionId: string): Promise<any | null> {
    const key = `${config.redisSessionPrefix}${sessionId}`
    const data = await this.client.get(key)
    return data ? JSON.parse(data) : null
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `${config.redisSessionPrefix}${sessionId}`
    await this.client.del(key)
  }

  async updateSession(sessionId: string, data: any): Promise<void> {
    const key = `${config.redisSessionPrefix}${sessionId}`
    const existing = await this.client.get(key)
    if (existing) {
      const current = JSON.parse(existing)
      await this.client.set(key, JSON.stringify({ ...current, ...data }))
    }
  }

  async getSessionTTL(sessionId: string): Promise<number> {
    const key = `${config.redisSessionPrefix}${sessionId}`
    return await this.client.ttl(key)
  }

  // Token Operations
  async setToken(tokenId: string, data: any, ttl: number): Promise<void> {
    const key = `${config.redisTokenPrefix}${tokenId}`
    await this.client.setex(key, ttl, JSON.stringify(data))
  }

  async getToken(tokenId: string): Promise<any | null> {
    const key = `${config.redisTokenPrefix}${tokenId}`
    const data = await this.client.get(key)
    return data ? JSON.parse(data) : null
  }

  async deleteToken(tokenId: string): Promise<void> {
    const key = `${config.redisTokenPrefix}${tokenId}`
    await this.client.del(key)
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const pattern = `${config.redisTokenPrefix}*`
    const keys = await this.client.keys(pattern)
    const pipeline = this.client.pipeline()

    for (const key of keys) {
      const data = await this.client.get(key)
      if (data) {
        const parsed = JSON.parse(data)
        if (parsed.userId === userId) {
          pipeline.del(key)
        }
      }
    }

    await pipeline.exec()
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping()
      return true
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }
}

export const redis = new RedisClient()
