module.exports = {
  apps: [
    {
      name: "klira-server",
      script: "dist/server/app.js",
      instances: 1, // keeper has no leader election, keep at 1
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      max_memory_restart: "500M",
      // Log rotation: install pm2-logrotate for production
      //   pm2 install pm2-logrotate
      //   pm2 set pm2-logrotate:max_size 10M
      //   pm2 set pm2-logrotate:retain 7
      max_size: "10M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false,
      kill_timeout: 15000, // match graceful shutdown timeout
    },
  ],
};
