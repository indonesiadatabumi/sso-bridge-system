// API utility functions for the SSO Dashboard

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Generic fetch wrapper
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'API request failed',
      }
    }

    return {
      success: true,
      data: data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Tenant API
export const tenantAPI = {
  list: async () => {
    return fetchAPI<any[]>('/api/v1/tenants')
  },

  get: async (id: string) => {
    return fetchAPI<any>(`/api/v1/tenants/${id}`)
  },

  create: async (data: any) => {
    return fetchAPI<any>('/api/v1/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: any) => {
    return fetchAPI<any>(`/api/v1/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchAPI<void>(`/api/v1/tenants/${id}`, {
      method: 'DELETE',
    })
  },
}

// App API
export const appAPI = {
  list: async () => {
    return fetchAPI<any[]>('/api/v1/apps')
  },

  get: async (id: string) => {
    return fetchAPI<any>(`/api/v1/apps/${id}`)
  },

  create: async (data: any) => {
    return fetchAPI<any>('/api/v1/apps', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: any) => {
    return fetchAPI<any>(`/api/v1/apps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchAPI<void>(`/api/v1/apps/${id}`, {
      method: 'DELETE',
    })
  },

  regenerateSecret: async (id: string) => {
    return fetchAPI<{ clientSecret: string }>(`/api/v1/apps/${id}/regenerate-secret`, {
      method: 'POST',
    })
  },
}

// Provider API
export const providerAPI = {
  list: async () => {
    return fetchAPI<any[]>('/api/v1/providers')
  },

  get: async (id: string) => {
    return fetchAPI<any>(`/api/v1/providers/${id}`)
  },

  getAvailable: async (tenantSlug: string) => {
    return fetchAPI<any[]>(`/api/v1/providers/available/${tenantSlug}`)
  },

  create: async (data: any) => {
    return fetchAPI<any>('/api/v1/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  createConfig: async (data: any) => {
    return fetchAPI<any>('/api/v1/providers/config', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchAPI<void>(`/api/v1/providers/${id}`, {
      method: 'DELETE',
    })
  },
}

// User API (will need to be implemented in backend)
export const userAPI = {
  list: async () => {
    return fetchAPI<any[]>('/api/v1/users')
  },

  get: async (id: string) => {
    return fetchAPI<any>(`/api/v1/users/${id}`)
  },

  create: async (data: any) => {
    return fetchAPI<any>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: any) => {
    return fetchAPI<any>(`/api/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchAPI<void>(`/api/v1/users/${id}`, {
      method: 'DELETE',
    })
  },
}

// Health check
export const healthCheck = async () => {
  return fetchAPI<{
    status: string
    service: string
    version: string
    timestamp: string
    checks: {
      redis: string
      database: string
    }
  }>('/health')
}

export default {
  tenant: tenantAPI,
  app: appAPI,
  provider: providerAPI,
  user: userAPI,
  healthCheck,
}
