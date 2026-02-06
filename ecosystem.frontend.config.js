module.exports = {
  apps: [
    {
      name: 'sso-bridge-frontend',
      script: 'bun',
      args: 'run dev',
      cwd: '/home/z/my-project',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/home/z/my-project/logs/sso-frontend-error.log',
      out_file: '/home/z/my-project/logs/sso-frontend-out.log',
      log_file: '/home/z/my-project/logs/sso-frontend-combined.log',
      time: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
}
