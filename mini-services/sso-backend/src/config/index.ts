export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisSessionPrefix: process.env.REDIS_SESSION_PREFIX || 'sso:session:',
  redisTokenPrefix: process.env.REDIS_TOKEN_PREFIX || 'sso:token:',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    accessTokenExpiry: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY || '3600'),
    refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || '2592000'),
    idTokenExpiry: parseInt(process.env.JWT_ID_TOKEN_EXPIRY || '3600'),
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key',
  },
  ssoCallbackUrl: process.env.SSO_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/callback',
  corsOrigin: process.env.CORS_ORIGIN || '*',
}

export default config
