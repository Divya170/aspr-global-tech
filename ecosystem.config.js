// PM2 process file: `pm2 start ecosystem.config.js && pm2 save`.
// server.js runs both halves in one process: the website (PORT, default 3000) and the private
// API (127.0.0.1:API_PORT, default 4000). One instance only: SQLite and the in-memory rate limiter
// assume a single process. PM2 restarts it on crash, on memory bloat and after a reboot (pm2 startup).
module.exports = {
  apps: [
    {
      name: 'aspr-global-tech',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      min_uptime: '30s',
      restart_delay: 3000,
      exp_backoff_restart_delay: 200,
      max_memory_restart: '700M',
      kill_timeout: 12000,
      time: true,
      env: { NODE_ENV: 'production' },
    },
  ],
};
