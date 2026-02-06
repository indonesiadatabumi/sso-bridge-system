module.exports = {
  apps: [
    {
      name: 'sso-backend',
      script: 'index.ts',
      interpreter: 'bun',
      interpreter_args: '--hot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/sso-backend-error.log',
      out_file: './logs/sso-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
}
