module.exports = {
  apps: [
    {
      name: 'sso-admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/home/z/my-project',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/sso-admin-error.log',
      out_file: './logs/sso-admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'sso-backend',
      script: 'index.ts',
      cwd: '/home/z/my-project/mini-services/sso-backend',
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
      error_file: './mini-services/sso-backend/logs/sso-backend-error.log',
      out_file: './mini-services/sso-backend/logs/sso-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
}
