// PM2 process file for a VPS: `pm2 start ecosystem.config.js && pm2 save`.
// One instance only: SQLite and the in-memory rate limiter assume a single process.
module.exports = {
  apps: [
    {
      name: 'aspr-global-tech',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '700M',
      kill_timeout: 12000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
