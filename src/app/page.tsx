'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Building2, Users, Key, Shield, Activity, Settings, Plus, Edit, Trash2, ExternalLink, Copy, CheckCircle, XCircle, Clock, Globe, Terminal } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Mock data - will be replaced with API calls
interface Tenant {
  id: string
  name: string
  slug: string
  domain: string | null
  isActive: boolean
  appCount: number
  userCount: number
  createdAt: string
}

interface SSOProvider {
  id: string
  name: string
  type: string
  provider: string
  isActive: boolean
  isGlobal: boolean
  tenantCount: number
}

interface App {
  id: string
  tenantId: string
  tenantName: string
  name: string
  clientId: string
  redirectUris: string[]
  isActive: boolean
  sessionCount: number
  createdAt: string
}

interface User {
  id: string
  tenantId: string
  tenantName: string
  email: string
  name: string | null
  hasPassword: boolean
  ssoProviders: string[]
  isActive: boolean
  lastLoginAt: string | null
  sessionCount: number
}

export default function SSODashboard() {
  const { toast } = useToast()

  // State for tenants
  const [tenants, setTenants] = useState<Tenant[]>([
    { id: '1', name: 'Acme Corporation', slug: 'acme', domain: 'sso.acme.com', isActive: true, appCount: 5, userCount: 120, createdAt: '2024-01-15' },
    { id: '2', name: 'TechStart Inc', slug: 'techstart', domain: null, isActive: true, appCount: 3, userCount: 85, createdAt: '2024-02-20' },
    { id: '3', name: 'Demo Company', slug: 'demo', domain: null, isActive: false, appCount: 2, userCount: 45, createdAt: '2024-03-01' },
  ])
  const [isTenantDialogOpen, setIsTenantDialogOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)

  // State for SSO providers
  const [ssoProviders, setSsoProviders] = useState<SSOProvider[]>([
    { id: '1', name: 'Google OAuth', type: 'oauth2', provider: 'google', isActive: true, isGlobal: true, tenantCount: 3 },
    { id: '2', name: 'Microsoft Azure AD', type: 'oidc', provider: 'microsoft', isActive: true, isGlobal: true, tenantCount: 2 },
    { id: '3', name: 'GitHub OAuth', type: 'oauth2', provider: 'github', isActive: true, isGlobal: false, tenantCount: 1 },
    { id: '4', name: 'Okta SSO', type: 'oidc', provider: 'okta', isActive: false, isGlobal: false, tenantCount: 0 },
  ])
  const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<SSOProvider | null>(null)
  const [isProviderConfigDialogOpen, setIsProviderConfigDialogOpen] = useState(false)
  const [configuringProvider, setConfiguringProvider] = useState<SSOProvider | null>(null)

  // State for apps
  const [apps, setApps] = useState<App[]>([
    { id: '1', tenantId: '1', tenantName: 'Acme Corporation', name: 'HR Portal', clientId: 'hr-portal-client', redirectUris: ['https://hr.acme.com/callback'], isActive: true, sessionCount: 45, createdAt: '2024-01-20' },
    { id: '2', tenantId: '1', tenantName: 'Acme Corporation', name: 'Dashboard App', clientId: 'dashboard-client', redirectUris: ['https://dashboard.acme.com/callback'], isActive: true, sessionCount: 62, createdAt: '2024-01-25' },
    { id: '3', tenantId: '2', tenantName: 'TechStart Inc', name: 'Internal Tools', clientId: 'tools-client', redirectUris: ['https://tools.techstart.io/callback'], isActive: true, sessionCount: 28, createdAt: '2024-02-25' },
  ])
  const [isAppDialogOpen, setIsAppDialogOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<App | null>(null)

  // State for users
  const [users, setUsers] = useState<User[]>([
    { id: '1', tenantId: '1', tenantName: 'Acme Corporation', email: 'john@acme.com', name: 'John Doe', hasPassword: true, ssoProviders: ['google', 'microsoft'], isActive: true, lastLoginAt: '2024-03-15T10:30:00Z', sessionCount: 3 },
    { id: '2', tenantId: '1', tenantName: 'Acme Corporation', email: 'jane@acme.com', name: 'Jane Smith', hasPassword: false, ssoProviders: ['github'], isActive: true, lastLoginAt: '2024-03-14T15:45:00Z', sessionCount: 1 },
    { id: '3', tenantId: '2', tenantName: 'TechStart Inc', email: 'mike@techstart.io', name: 'Mike Johnson', hasPassword: true, ssoProviders: [], isActive: true, lastLoginAt: '2024-03-13T09:20:00Z', sessionCount: 2 },
  ])

  // State for API Playground
  const [selectedApiEndpoint, setSelectedApiEndpoint] = useState('login')
  const [apiRequest, setApiRequest] = useState('')
  const [apiResponse, setApiResponse] = useState('')
  const [isApiLoading, setIsApiLoading] = useState(false)
  const [savedTokens, setSavedTokens] = useState<{ name: string; token: string; description: string }[]>([
    { name: 'App 1 Token', token: 'app_client_123', description: 'HR Portal client' },
  ])

  // Handler functions
  const handleSaveTenant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    toast({
      title: editingTenant ? 'Tenant updated' : 'Tenant created',
      description: `Tenant has been ${editingTenant ? 'updated' : 'created'} successfully`,
    })
    setIsTenantDialogOpen(false)
    setEditingTenant(null)
  }

  const handleDeleteTenant = (id: string) => {
    setTenants(tenants.filter(t => t.id !== id))
    toast({
      title: 'Tenant deleted',
      description: 'Tenant has been deleted successfully',
    })
  }

  const handleSaveProvider = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    toast({
      title: editingProvider ? 'SSO Provider updated' : 'SSO Provider created',
      description: `SSO Provider has been ${editingProvider ? 'updated' : 'created'} successfully`,
    })
    setIsProviderDialogOpen(false)
    setEditingProvider(null)
  }

  const handleDeleteProvider = (id: string) => {
    setSsoProviders(ssoProviders.filter(p => p.id !== id))
    toast({
      title: 'SSO Provider deleted',
      description: 'SSO Provider has been deleted successfully',
    })
  }

  const handleConfigureProvider = (provider: SSOProvider) => {
    setConfiguringProvider(provider)
    setIsProviderConfigDialogOpen(true)
  }

  const handleSaveProviderConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    const tenantId = formData.get('tenantId') as string
    const clientId = formData.get('clientId') as string
    const clientSecret = formData.get('clientSecret') as string
    const redirectUri = formData.get('redirectUri') as string
    const scopes = formData.get('scopes') as string

    if (!configuringProvider || !tenantId || !clientId || !clientSecret) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/v1/providers/config?XTransformPort=3001', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          provider_id: configuringProvider.id,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri || undefined,
          scopes: scopes || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Provider configured',
          description: `SSO Provider has been configured successfully`,
        })
        setIsProviderConfigDialogOpen(false)
        setConfiguringProvider(null)
      } else {
        throw new Error(data.error || 'Failed to configure provider')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to configure provider',
        variant: 'destructive',
      })
    }
  }

  const handleSaveApp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    toast({
      title: editingApp ? 'App updated' : 'App created',
      description: `App has been ${editingApp ? 'updated' : 'created'} successfully`,
    })
    setIsAppDialogOpen(false)
    setEditingApp(null)
  }

  const handleDeleteApp = (id: string) => {
    setApps(apps.filter(a => a.id !== id))
    toast({
      title: 'App deleted',
      description: 'App has been deleted successfully',
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: text,
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // API Playground handlers
  const handleApiTest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsApiLoading(true)
    setApiResponse('')

    try {
      const formData = new FormData(e.currentTarget)
      const endpoint = formData.get('endpoint') as string
      const body = formData.get('body') as string
      const token = formData.get('token') as string

      const endpointConfig = getApiEndpointConfig(endpoint)
      
      const options: RequestInit = {
        method: endpointConfig.method,
        headers: {},
      }

      if (endpointConfig.requiresAuth && token) {
        options.headers['Authorization'] = `Bearer ${token}`
      }

      if (endpointConfig.method !== 'GET' && body) {
        options.headers['Content-Type'] = 'application/json'
        options.body = body
      }

      const response = await fetch(`/api/v1${endpointConfig.path}?XTransformPort=3001`, options)
      const data = await response.text()

      setApiResponse(formatJson(data))
      toast({
        title: 'API Request Successful',
        description: `${endpointConfig.name} completed`,
      })
    } catch (error) {
      setApiResponse(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      }, null, 2))
      toast({
        title: 'API Request Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsApiLoading(false)
    }
  }

  const getApiEndpointConfig = (endpoint: string) => {
    const configs: Record<string, any> = {
      'login': {
        name: 'Normal Login',
        method: 'POST',
        path: '/auth/login',
        requiresAuth: false,
        template: {
          tenant_slug: 'acme',
          email: 'user@example.com',
          password: 'password123',
          client_id: 'app_client_123',
        },
      },
      'sso-init': {
        name: 'Initiate SSO',
        method: 'POST',
        path: '/auth/sso/init',
        requiresAuth: false,
        template: {
          tenant_slug: 'acme',
          provider_id: 'provider_id_here',
          client_id: 'app_client_123',
          redirect_uri: 'https://your-app.com/callback',
        },
      },
      'callback': {
        name: 'SSO Callback',
        method: 'GET',
        path: '/auth/callback',
        requiresAuth: false,
        template: null,
      },
      'refresh': {
        name: 'Refresh Token',
        method: 'POST',
        path: '/auth/refresh',
        requiresAuth: false,
        template: {
          refresh_token: 'refresh_token_here',
        },
      },
      'logout': {
        name: 'Logout',
        method: 'POST',
        path: '/auth/logout',
        requiresAuth: true,
        template: null,
      },
      'validate-token': {
        name: 'Validate Token',
        method: 'GET',
        path: '/tokens/validate',
        requiresAuth: true,
        template: null,
      },
      'get-token-info': {
        name: 'Get Token Info',
        method: 'GET',
        path: '/tokens/info',
        requiresAuth: true,
        template: null,
      },
      'revoke-token': {
        name: 'Revoke Token',
        method: 'POST',
        path: '/tokens/revoke',
        requiresAuth: true,
        template: {
          token: 'token_here',
        },
      },
      'revoke-all-tokens': {
        name: 'Revoke All User Tokens',
        method: 'POST',
        path: '/tokens/revoke-all',
        requiresAuth: true,
        template: null,
      },
      'tenants': {
        name: 'List Tenants',
        method: 'GET',
        path: '/tenants',
        requiresAuth: false,
        template: null,
      },
      'apps': {
        name: 'List Apps',
        method: 'GET',
        path: '/apps',
        requiresAuth: false,
        template: null,
      },
      'providers': {
        name: 'List Providers',
        method: 'GET',
        path: '/providers',
        requiresAuth: false,
        template: null,
      },
    }

    return configs[endpoint] || configs['login']
  }

  const formatJson = (json: string) => {
    try {
      const parsed = JSON.parse(json)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return json
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: text.length > 50 ? `${text.substring(0, 50)}...` : text,
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">SSO Bridge System</h1>
                <p className="text-sm text-muted-foreground">Multi-tenant session management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-2">
                <Activity className="h-3 w-3" />
                System Active
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs defaultValue="tenants" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="tenants" className="gap-2">
              <Building2 className="h-4 w-4" />
              Tenants
            </TabsTrigger>
            <TabsTrigger value="providers" className="gap-2">
              <Key className="h-4 w-4" />
              SSO Providers
            </TabsTrigger>
            <TabsTrigger value="apps" className="gap-2">
              <Globe className="h-4 w-4" />
              Apps
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="api-playground" className="gap-2">
              <Terminal className="h-4 w-4" />
              API Playground
            </TabsTrigger>
          </TabsList>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tenant Management</CardTitle>
                    <CardDescription>Manage organizations using the SSO system</CardDescription>
                  </div>
                  <Dialog open={isTenantDialogOpen} onOpenChange={setIsTenantDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingTenant(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tenant
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Create New Tenant'}</DialogTitle>
                        <DialogDescription>
                          {editingTenant ? 'Update tenant information' : 'Add a new organization to the SSO system'}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSaveTenant}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Organization Name *</Label>
                            <Input id="name" placeholder="Acme Corporation" defaultValue={editingTenant?.name} required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="slug">Slug *</Label>
                            <Input id="slug" placeholder="acme" defaultValue={editingTenant?.slug} required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="domain">Custom Domain (Optional)</Label>
                            <Input id="domain" placeholder="sso.acme.com" defaultValue={editingTenant?.domain || ''} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="Organization description" defaultValue="" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">{editingTenant ? 'Update' : 'Create'} Tenant</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Apps</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded">{tenant.slug}</code>
                          </TableCell>
                          <TableCell>{tenant.domain || '-'}</TableCell>
                          <TableCell>{tenant.appCount}</TableCell>
                          <TableCell>{tenant.userCount}</TableCell>
                          <TableCell>
                            <Badge variant={tenant.isActive ? 'default' : 'secondary'}>
                              {tenant.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingTenant(tenant)
                                  setIsTenantDialogOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTenant(tenant.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SSO Providers Tab */}
          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SSO Provider Configuration</CardTitle>
                    <CardDescription>Configure OAuth 2.0, OIDC, and social login providers</CardDescription>
                  </div>
                  <Dialog open={isProviderDialogOpen} onOpenChange={setIsProviderDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingProvider(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Provider
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>{editingProvider ? 'Edit SSO Provider' : 'Add SSO Provider'}</DialogTitle>
                        <DialogDescription>
                          Configure a new SSO provider for authentication
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSaveProvider}>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="providerName">Provider Name *</Label>
                              <Input id="providerName" placeholder="Google OAuth" defaultValue={editingProvider?.name} required />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="providerType">Type *</Label>
                              <Select defaultValue="oauth2">
                                <SelectTrigger id="providerType">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                                  <SelectItem value="oidc">OpenID Connect</SelectItem>
                                  <SelectItem value="saml">SAML 2.0</SelectItem>
                                  <SelectItem value="social">Social Login</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="provider">Provider *</Label>
                            <Select defaultValue="google">
                              <SelectTrigger id="provider">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="google">Google</SelectItem>
                                <SelectItem value="microsoft">Microsoft</SelectItem>
                                <SelectItem value="facebook">Facebook</SelectItem>
                                <SelectItem value="github">GitHub</SelectItem>
                                <SelectItem value="linkedin">LinkedIn</SelectItem>
                                <SelectItem value="okta">Okta</SelectItem>
                                <SelectItem value="auth0">Auth0</SelectItem>
                                <SelectItem value="custom">Custom Provider</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="authUrl">Authorization Endpoint *</Label>
                            <Input id="authUrl" placeholder="https://accounts.google.com/o/oauth2/v2/auth" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="tokenUrl">Token Endpoint *</Label>
                            <Input id="tokenUrl" placeholder="https://oauth2.googleapis.com/token" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="userInfoUrl">User Info Endpoint</Label>
                            <Input id="userInfoUrl" placeholder="https://www.googleapis.com/oauth2/v3/userinfo" />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch id="isActive" defaultChecked />
                              <Label htmlFor="isActive">Active</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch id="isGlobal" />
                              <Label htmlFor="isGlobal">Global Provider</Label>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">{editingProvider ? 'Update' : 'Add'} Provider</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Tenants</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ssoProviders.map((provider) => (
                        <TableRow key={provider.id}>
                          <TableCell className="font-medium">{provider.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{provider.type.toUpperCase()}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{provider.provider}</TableCell>
                          <TableCell>{provider.tenantCount}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                                {provider.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              {provider.isGlobal && (
                                <Badge variant="outline">Global</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{provider.isGlobal ? 'All Tenants' : 'Selected'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleConfigureProvider(provider)}
                                title="Configure Provider"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingProvider(provider)
                                  setIsProviderDialogOpen(true)
                                }}
                                title="Edit Provider"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteProvider(provider.id)}
                                title="Delete Provider"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Provider Configuration Dialog */}
          <Dialog open={isProviderConfigDialogOpen} onOpenChange={setIsProviderConfigDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Configure SSO Provider</DialogTitle>
                <DialogDescription>
                  Configure {configuringProvider?.name} ({configuringProvider?.provider}) with your credentials
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveProviderConfig}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tenantId">Select Tenant *</Label>
                    <Select name="tenantId" required>
                      <SelectTrigger id="tenantId">
                        <SelectValue placeholder="Choose a tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name} ({tenant.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientId">Client ID *</Label>
                    <Input
                      id="clientId"
                      name="clientId"
                      placeholder="e.g., 123456789-abcde.apps.googleusercontent.com"
                      required
                      type="text"
                    />
                    <p className="text-xs text-muted-foreground">
                      Get this from your OAuth provider's developer console
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientSecret">Client Secret *</Label>
                    <Input
                      id="clientSecret"
                      name="clientSecret"
                      placeholder="e.g., GOCSPX-..."
                      required
                      type="password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Get this from your OAuth provider's developer console. This will be encrypted.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="redirectUri">Redirect URI (Optional)</Label>
                    <Input
                      id="redirectUri"
                      name="redirectUri"
                      placeholder="https://your-app.com/callback"
                      type="url"
                    />
                    <p className="text-xs text-muted-foreground">
                      The URL where users will be redirected after authentication
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="scopes">Scopes (Optional)</Label>
                    <Input
                      id="scopes"
                      name="scopes"
                      placeholder="openid profile email"
                      type="text"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated list of OAuth scopes
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsProviderConfigDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Configuration</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Apps Tab */}
          <TabsContent value="apps" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Application Management</CardTitle>
                    <CardDescription>Manage OAuth client applications</CardDescription>
                  </div>
                  <Dialog open={isAppDialogOpen} onOpenChange={setIsAppDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingApp(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add App
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>{editingApp ? 'Edit Application' : 'Create New Application'}</DialogTitle>
                        <DialogDescription>
                          Register a new application to use the SSO system
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSaveApp}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="tenant">Tenant *</Label>
                            <Select defaultValue="">
                              <SelectTrigger id="tenant">
                                <SelectValue placeholder="Select a tenant" />
                              </SelectTrigger>
                              <SelectContent>
                                {tenants.filter(t => t.isActive).map((tenant) => (
                                  <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="appName">Application Name *</Label>
                            <Input id="appName" placeholder="My Dashboard App" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="redirectUris">Redirect URIs * (one per line)</Label>
                            <Textarea
                              id="redirectUris"
                              placeholder="https://myapp.com/callback&#10;https://myapp.com/auth/callback"
                              rows={3}
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="allowedOrigins">Allowed CORS Origins (Optional)</Label>
                            <Textarea
                              id="allowedOrigins"
                              placeholder="https://myapp.com&#10;https://admin.myapp.com"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="tokenExpiration">Token Expiration (seconds)</Label>
                              <Input id="tokenExpiration" type="number" defaultValue="3600" />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="refreshTokenExpiration">Refresh Token Expiration (seconds)</Label>
                              <Input id="refreshTokenExpiration" type="number" defaultValue="2592000" />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch id="appActive" defaultChecked />
                            <Label htmlFor="appActive">Active</Label>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">{editingApp ? 'Update' : 'Create'} Application</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application Name</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Client ID</TableHead>
                        <TableHead>Redirect URIs</TableHead>
                        <TableHead>Sessions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apps.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.name}</TableCell>
                          <TableCell>{app.tenantName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-muted px-2 py-1 rounded flex-1">{app.clientId}</code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(app.clientId)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {app.redirectUris.slice(0, 2).map((uri, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {uri.length > 30 ? uri.substring(0, 30) + '...' : uri}
                                </Badge>
                              ))}
                              {app.redirectUris.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{app.redirectUris.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{app.sessionCount}</TableCell>
                          <TableCell>
                            <Badge variant={app.isActive ? 'default' : 'secondary'}>
                              {app.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(app.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingApp(app)
                                  setIsAppDialogOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteApp(app.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.reduce((acc, u) => acc + u.sessionCount, 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SSO Users</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.filter(u => u.ssoProviders.length > 0).length}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage user accounts across all tenants</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Auth Methods</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Sessions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name || user.email}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{user.tenantName}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.hasPassword && (
                                <Badge variant="outline" className="gap-1">
                                  <Key className="h-3 w-3" />
                                  Password
                                </Badge>
                              )}
                              {user.ssoProviders.map((provider) => (
                                <Badge key={provider} variant="outline" className="capitalize">
                                  {provider}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'default' : 'secondary'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(user.lastLoginAt)}</TableCell>
                          <TableCell>{user.sessionCount}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Playground Tab */}
          <TabsContent value="api-playground" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Playground</CardTitle>
                <CardDescription>Test SSO API endpoints directly from here</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {/* Endpoint Selection */}
                  <div className="space-y-3">
                    <Label>1. Select API Endpoint</Label>
                    <Select value={selectedApiEndpoint} onValueChange={setSelectedApiEndpoint}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an endpoint" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="login">Normal Login</SelectItem>
                        <SelectItem value="sso-init">Initiate SSO</SelectItem>
                        <SelectItem value="callback">SSO Callback</SelectItem>
                        <SelectItem value="refresh">Refresh Token</SelectItem>
                        <SelectItem value="logout">Logout</SelectItem>
                        <SelectItem value="validate-token">Validate Token</SelectItem>
                        <SelectItem value="get-token-info">Get Token Info</SelectItem>
                        <SelectItem value="revoke-token">Revoke Token</SelectItem>
                        <SelectItem value="revoke-all-tokens">Revoke All User Tokens</SelectItem>
                        <SelectItem value="tenants">List Tenants</SelectItem>
                        <SelectItem value="apps">List Apps</SelectItem>
                        <SelectItem value="providers">List Providers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Request Configuration */}
                  <div className="space-y-3">
                    <Label>2. Configure Request</Label>
                    <form onSubmit={handleApiTest}>
                      <div className="grid gap-3">
                        {getApiEndpointConfig(selectedApiEndpoint).template && (
                          <div className="space-y-2">
                            <Label>Request Body (JSON)</Label>
                            <Textarea
                              id="apiRequest"
                              value={apiRequest}
                              onChange={(e) => setApiRequest(e.target.value)}
                              placeholder="Edit the JSON request body"
                              className="font-mono text-xs"
                              rows={8}
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label>Authorization Token (if required)</Label>
                          <Select 
                            value={savedTokens[0]?.token || ''} 
                            onValueChange={(value) => {
                              const selected = savedTokens.find(t => t.token === value)
                              if (selected) {
                                // Update selected or add new token
                                if (savedTokens.find(t => t.name === 'Custom')) {
                                  setSavedTokens(prev => prev => 
                                    prev.map(t => 
                                      t.name === 'Custom' ? { ...t, token: value } : t
                                    )
                                  )
                                } else {
                                  setSavedTokens([...savedTokens, { name: 'Custom', token: value, description: 'Custom token' }])
                                }
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select or enter custom token" />
                            </SelectTrigger>
                            <SelectContent>
                              {savedTokens.map((token) => (
                                <SelectItem key={token.name} value={token.token}>
                                  {token.name} - {token.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button type="submit" disabled={isApiLoading} className="w-full">
                          {isApiLoading ? (
                            <>
                              <span className="animate-pulse">Sending...</span>
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Send Request
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Response Display */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>3. Response</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (apiResponse) {
                            copyToClipboard(apiResponse)
                          }
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="relative">
                      <Textarea
                        value={apiResponse}
                        onChange={(e) => setApiResponse(e.target.value)}
                        placeholder="Response will appear here..."
                        className="font-mono text-xs min-h-[200px]"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Quick Reference */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">Quick Reference</h4>
                    <div className="grid gap-2 text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Code className="bg-muted px-2 py-1 rounded text-xs">POST</Code>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Normal Login</p>
                          <code className="block text-xs mt-1">/api/v1/auth/login</code>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Code className="bg-muted px-2 py-1 rounded text-xs">POST</Code>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Initiate SSO</p>
                          <code className="block text-xs mt-1">/api/v1/auth/sso/init</code>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Code className="bg-muted px-2 py-1 rounded text-xs">GET</Code>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">SSO Callback</p>
                          <code className="block text-xs mt-1">/api/v1/auth/callback</code>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Code className="bg-muted px-2 py-1 rounded text-xs">GET</Code>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Validate Token</p>
                          <code className="block text-xs mt-1">/api/v1/tokens/validate</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>SSO Bridge System v1.0.0</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                PostgreSQL Connected
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-orange-500" />
                Redis Connected
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
