# How to Configure SSO Provider Credentials (clientId & clientSecret)

## 🎯 Overview

When setting up SSO providers like Google, Microsoft, Facebook, or GitHub, you need to configure two main things:

1. **Provider Definition** - What the provider is (endpoints, type, etc.)
2. **Provider Credentials** - Your `clientId` and `clientSecret` from the provider

The UI now supports both! Here's how to use it:

---

## 📍 Where to Fill clientId and clientSecret

### Step 1: Go to SSO Providers Tab

In the Admin Dashboard, click on the **"SSO Providers"** tab.

### Step 2: Click the "Configure" Button (⚙️ Settings Icon)

For each provider in the list, you'll see three action buttons:
- **⚙️ Configure** - Click this to add credentials for a specific tenant
- ✏️ Edit - Edit the provider definition
- 🗑️ Delete - Delete the provider

Click the **⚙️ Configure** button to open the configuration dialog.

### Step 3: Fill in the Configuration Dialog

The dialog will open with the following fields:

```
┌─────────────────────────────────────────────────────────────┐
│  Configure SSO Provider                                     │
│  Configure Google OAuth (google) with your credentials       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Select Tenant *                                            │
│  [Acme Corporation (acme) ▼]                               │
│                                                             │
│  Client ID *                                               │
│  [123456789-abcde.apps.googleusercontent.com            ]    │
│  Get this from your OAuth provider's developer console      │
│                                                             │
│  Client Secret *                                           │
│  [••••••••••••••••••••••••••••••••••••••••••••••••••••]    │
│  Get this from your OAuth provider's developer console.      │
│  This will be encrypted.                                    │
│                                                             │
│  Redirect URI (Optional)                                   │
│  [https://your-app.com/callback                          ]    │
│  The URL where users will be redirected after auth        │
│                                                             │
│  Scopes (Optional)                                         │
│  [openid profile email                                    ]    │
│  Comma-separated list of OAuth scopes                       │
│                                                             │
│  [Cancel]  [Save Configuration]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Fill in Your Credentials

**Required Fields:**
- **Tenant**: Select which tenant this configuration is for
- **Client ID**: Your OAuth client ID from the provider
- **Client Secret**: Your OAuth client secret from the provider

**Optional Fields:**
- **Redirect URI**: Custom redirect URL for this tenant
- **Scopes**: Custom OAuth scopes (comma-separated)

### Step 5: Save Configuration

Click **"Save Configuration"** to store the credentials.

---

## 🔑 Where to Get clientId and clientSecret

### Google OAuth 2.0

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to: **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth client ID"**
5. Select **"Web application"**
6. Add authorized redirect URIs (e.g., `http://localhost:3001/api/v1/auth/callback`)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

**Example:**
```
Client ID: 123456789-abcde.apps.googleusercontent.com
Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxx
```

### Microsoft Azure AD

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**
4. Enter a name (e.g., "My SSO App")
5. Select account type
6. Add a redirect URI
7. Click **Register**
8. Copy the **Application (client) ID** and **Client Secret**

**Example:**
```
Client ID: 8c3f3f3b-3b3b-3b3b-3b3b-3b3b3b3b3b3b
Client Secret: abc123~DEF456...
```

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"OAuth Apps"** → **"New OAuth App"**
3. Fill in:
   - Application name
   - Homepage URL
   - Application description
   - Authorization callback URL: `http://localhost:3001/api/v1/auth/callback`
4. Click **"Register application"**
5. Copy the **Client ID** and generate a **Client Secret**

**Example:**
```
Client ID: Iv1.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7
Client Secret: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Facebook Login

1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Create a new app or select existing one
3. Navigate to **Settings** → **Basic**
4. Add a platform: **Web**
5. Set Site URL and Save
6. Add **Facebook Login** product
7. Go to **Settings** → **Advanced**
8. Add Valid OAuth Redirect URIs
9. Copy the **App ID** and **App Secret**

**Example:**
```
Client ID (App ID): 123456789012345
Client Secret (App Secret): abc123def456ghi789jkl012mno345pqr
```

---

## 🔧 How It Works Internally

### Two-Tier Configuration

The system uses a two-tier configuration approach:

#### 1. **SSOProvider** (Provider Definition)
- Contains the provider's technical details
- Endpoints (auth, token, user info)
- Provider type (OAuth 2.0, OIDC, SAML, Social)
- Can be global (available to all tenants) or tenant-specific

#### 2. **SSOProviderConfig** (Provider Credentials)
- Contains your credentials for a specific tenant
- `clientId` - Your OAuth client ID
- `clientSecret` - Your OAuth client secret (encrypted)
- `redirectUri` - Custom redirect URL for the tenant
- `scopes` - Custom OAuth scopes
- Stored per-tenant, per-provider

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Admin creates SSOProvider (Google)                        │
│    - Name: "Google OAuth"                                    │
│    - Type: OAuth 2.0                                         │
│    - Provider: google                                         │
│    - Auth URL: https://accounts.google.com/o/oauth2/v2/auth │
│    - Token URL: https://oauth2.googleapis.com/token          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Admin configures provider credentials for Tenant A        │
│    - Tenant: Acme Corporation                               │
│    - Provider: Google OAuth                                  │
│    - Client ID: 123...apps.googleusercontent.com           │
│    - Client Secret: GOCSPX-... (encrypted)                  │
│    - Redirect URI: https://acme.com/callback               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. User tries to login via Google                          │
│    - System uses Tenant A's Google config                  │
│    - Redirects to Google with Client ID from step 2          │
│    - Handles callback with Client Secret                      │
└─────────────────────────────────────────────────────────────┘
```

### Security: Client Secret Encryption

The `clientSecret` is **encrypted** before storing in the database:

```typescript
// From backend code (provider.routes.ts line 298-306)
const encrypted = cryptoService.encrypt(validated.client_secret)

const config = await db.sSOProviderConfig.create({
  data: {
    tenantId: validated.tenant_id,
    providerId: validated.provider_id,
    clientId: validated.client_id,
    clientSecret: `${encrypted.encrypted}:${encrypted.iv}:${encrypted.authTag}`,
    // ...
  },
})
```

Your secrets are never stored in plain text!

---

## 📋 Complete Setup Workflow

### Step 1: Create a Tenant
1. Go to **Tenants** tab
2. Click **"Add Tenant"**
3. Fill in tenant details
4. Save

### Step 2: Create an SSO Provider Definition
1. Go to **SSO Providers** tab
2. Click **"Add Provider"**
3. Fill in:
   - Provider Name (e.g., "Google OAuth")
   - Type (e.g., OAuth 2.0)
   - Provider (e.g., google)
   - Authorization URL
   - Token URL
   - User Info URL
4. Save

### Step 3: Configure Provider Credentials
1. In the **SSO Providers** tab, find the provider you created
2. Click the **⚙️ Configure** button (Settings icon)
3. Fill in:
   - **Select Tenant**: Choose which tenant this is for
   - **Client ID**: Paste your Google/Microsoft/GitHub client ID
   - **Client Secret**: Paste your client secret
   - (Optional) Redirect URI: Your app's callback URL
   - (Optional) Scopes: OAuth scopes
4. Click **"Save Configuration"**

### Step 4: Create an App
1. Go to **Apps** tab
2. Click **"Add App"**
3. Fill in app details
4. Save

### Step 5: Test SSO Login
1. Use the frontend to initiate SSO login
2. System redirects to Google/Microsoft/GitHub
3. User authenticates
4. Provider redirects back with authorization code
5. System exchanges code for tokens
6. User is logged in!

---

## 🧪 Testing the Configuration

### 1. Check if Configuration Exists

```bash
# Get provider with its configurations
curl http://localhost:3001/api/v1/providers/{provider_id}
```

Response will show tenant configurations (without the actual secret):
```json
{
  "success": true,
  "provider": {
    "id": "provider_123",
    "name": "Google OAuth",
    "tenantConfigs": [
      {
        "id": "config_456",
        "tenant": {
          "id": "tenant_789",
          "name": "Acme Corporation",
          "slug": "acme"
        },
        "clientId": "123456789-abcde.apps.googleusercontent.com",
        "scopes": "openid profile email",
        "isActive": true
      }
    ]
  }
}
```

### 2. Initiate SSO Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/sso/init \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "acme",
    "provider_id": "provider_123",
    "client_id": "your_app_client_id",
    "redirect_uri": "https://your-app.com/callback"
  }'
```

Response will give you the authorization URL to redirect the user to.

---

## 🎯 Summary

### Where to Fill clientId and clientSecret?

✅ **In the SSO Providers Tab**, click the **⚙️ Configure** button for each provider

### What Information Do You Need?

- **Client ID**: From your OAuth provider's developer console
- **Client Secret**: From your OAuth provider's developer console
- **Tenant**: Which organization this configuration is for
- **Redirect URI** (optional): Your app's callback URL
- **Scopes** (optional): OAuth permissions you need

### How Many Configurations Do You Need?

- **One provider definition** (e.g., one "Google OAuth" provider)
- **One configuration per tenant** (e.g., Acme's Google credentials, TechStart's Google credentials)

### Security Note

✅ Your `clientSecret` is **encrypted** before being stored in the database. It's never stored in plain text!

---

## 📚 API Reference

### Create Provider Configuration
```http
POST /api/v1/providers/config
Content-Type: application/json

{
  "tenant_id": "tenant_id_here",
  "provider_id": "provider_id_here",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "redirect_uri": "https://your-app.com/callback",
  "scopes": "openid profile email",
  "is_active": true,
  "priority": 0
}
```

### Get Provider with Configurations
```http
GET /api/v1/providers/:id
```

### Get Available Providers for Tenant
```http
GET /api/v1/providers/available/:tenantSlug
```

---

**Last Updated**: 2026-02-05
**Status**: ✅ UI Added - Configure button now available in SSO Providers tab
