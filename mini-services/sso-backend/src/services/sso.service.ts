import axios from 'axios'
import { db } from '../lib/prisma.js'
import { cryptoService } from '../lib/crypto.js'
import { v4 as uuidv4 } from 'uuid'

export interface SSOProviderConfig {
  id: string
  name: string
  type: string
  provider: string
  authUrl: string
  tokenUrl: string
  userInfoUrl: string | null
  scopes: string
  clientId: string
  clientSecret: string
  redirectUri: string | null
  mapping: any
}

export interface SSOUserInfo {
  id: string
  email: string
  name?: string
  avatar?: string
  [key: string]: any
}

export class SSOService {
  async getProviderConfig(tenantId: string, providerId: string): Promise<SSOProviderConfig | null> {
    const providerConfig = await db.sSOProviderConfig.findUnique({
      where: {
        tenantId_providerId: {
          tenantId,
          providerId,
        },
      },
      include: {
        provider: true,
      },
    })

    if (!providerConfig || !providerConfig.isActive) {
      return null
    }

    return {
      id: providerConfig.id,
      name: providerConfig.provider.name,
      type: providerConfig.provider.type,
      provider: providerConfig.provider.provider,
      authUrl: providerConfig.provider.authUrl,
      tokenUrl: providerConfig.provider.tokenUrl,
      userInfoUrl: providerConfig.provider.userInfoUrl,
      scopes: providerConfig.scopes || providerConfig.provider.scopes,
      clientId: providerConfig.clientId,
      clientSecret: cryptoService.decrypt(
        providerConfig.clientSecret.split(':')[0],
        providerConfig.clientSecret.split(':')[1],
        providerConfig.clientSecret.split(':')[2]
      ),
      redirectUri: providerConfig.redirectUri || null,
      mapping: providerConfig.mapping,
    }
  }

  async generateAuthorizationUrl(
    tenantId: string,
    providerId: string,
    state: string,
    redirectUri?: string
  ): Promise<string> {
    const config = await this.getProviderConfig(tenantId, providerId)

    if (!config) {
      throw new Error('SSO provider not found or inactive')
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri || config.redirectUri || process.env.SSO_CALLBACK_URL || '',
      response_type: 'code',
      scope: config.scopes,
      state: state,
    })

    return `${config.authUrl}?${params.toString()}`
  }

  async exchangeCodeForToken(
    tenantId: string,
    providerId: string,
    code: string,
    redirectUri?: string
  ): Promise<any> {
    const config = await this.getProviderConfig(tenantId, providerId)

    if (!config) {
      throw new Error('SSO provider not found or inactive')
    }

    const response = await axios.post(
      config.tokenUrl,
      new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: redirectUri || config.redirectUri || process.env.SSO_CALLBACK_URL || '',
        grant_type: 'authorization_code',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    return response.data
  }

  async getUserInfo(
    tenantId: string,
    providerId: string,
    accessToken: string
  ): Promise<SSOUserInfo> {
    const config = await this.getProviderConfig(tenantId, providerId)

    if (!config) {
      throw new Error('SSO provider not found or inactive')
    }

    if (!config.userInfoUrl) {
      throw new Error('User info endpoint not configured')
    }

    const response = await axios.get(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    // Map provider-specific fields to standard format
    const mapping = config.mapping || {}
    const userData = response.data

    return {
      id: this.getMappedValue(userData, mapping.id || 'id', userData.id),
      email: this.getMappedValue(userData, mapping.email || 'email', userData.email),
      name: this.getMappedValue(userData, mapping.name || 'name', userData.name) || undefined,
      avatar: this.getMappedValue(userData, mapping.avatar || 'picture', userData.picture) || undefined,
      ...userData,
    }
  }

  async findOrCreateUser(
    tenantId: string,
    provider: string,
    providerId: string,
    userInfo: SSOUserInfo,
    accessToken?: string,
    refreshToken?: string
  ): Promise<{ userId: string; isNewUser: boolean }> {
    // Check if user identity already exists
    let identity = await db.userIdentity.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: {
        user: true,
      },
    })

    if (identity && identity.user) {
      // Update existing identity
      if (accessToken) {
        const encrypted = cryptoService.encrypt(accessToken)
        await db.userIdentity.update({
          where: { id: identity!.id },
          data: {
            providerData: userInfo as any,
            accessToken: `${encrypted.encrypted}:${encrypted.iv}:${encrypted.authTag}`,
            tokenExpiry: refreshToken ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
          },
        })
      }

      // Update user last login
      await db.user.update({
        where: { id: identity.user.id },
        data: { lastLoginAt: new Date() },
      })

      return { userId: identity.user.id, isNewUser: false }
    }

    // Create new user
    const user = await db.user.create({
      data: {
        tenantId,
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        avatar: userInfo.avatar,
        emailVerified: true,
        isActive: true,
        metadata: userInfo as any,
      },
    })

    // Create user identity
    await db.userIdentity.create({
      data: {
        userId: user.id,
        provider,
        providerId,
        providerData: userInfo as any,
        accessToken: accessToken
          ? (() => {
              const encrypted = cryptoService.encrypt(accessToken)
              return `${encrypted.encrypted}:${encrypted.iv}:${encrypted.authTag}`
            })()
          : null,
        refreshToken: refreshToken
          ? (() => {
              const encrypted = cryptoService.encrypt(refreshToken)
              return `${encrypted.encrypted}:${encrypted.iv}:${encrypted.authTag}`
            })()
          : null,
        tokenExpiry: refreshToken ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      },
    })

    return { userId: user.id, isNewUser: true }
  }

  private getMappedValue(data: any, field: string, defaultValue: any): any {
    const keys = field.split('.')
    let value = data

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        return defaultValue
      }
    }

    return value
  }

  async getAvailableProviders(tenantId: string): Promise<any[]> {
    const globalProviders = await db.sSOProvider.findMany({
      where: {
        isGlobal: true,
        isActive: true,
      },
      include: {
        tenantConfigs: {
          where: { tenantId, isActive: true },
        },
      },
    })

    const tenantProviders = await db.sSOProviderConfig.findMany({
      where: {
        tenantId,
        isActive: true,
        provider: {
          isActive: true,
        },
      },
      include: {
        provider: true,
      },
    })

    const providers: any[] = []

    // Add global providers
    for (const provider of globalProviders) {
      providers.push({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        provider: provider.provider,
        isGlobal: true,
        configured: provider.tenantConfigs.length > 0,
      })
    }

    // Add tenant-specific providers
    for (const config of tenantProviders) {
      if (!providers.find(p => p.id === config.providerId)) {
        providers.push({
          id: config.provider.id,
          name: config.provider.name,
          type: config.provider.type,
          provider: config.provider.provider,
          isGlobal: false,
          configured: true,
        })
      }
    }

    return providers
  }
}

export const ssoService = new SSOService()
