// deploy/ecosystem.config.cjs
// Run from the api-server directory: pm2 start ../deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "blood-bank-api",
      script: "./dist/index.mjs",
      cwd: __dirname + "/../artifacts/api-server",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      // Restart on crash, but back off if it keeps crashing.
      max_restarts: 10,
      restart_delay: 3000,
      // Reload with zero downtime on `pm2 reload blood-bank-api`.
      exec_mode: "fork",
      instances: 1,
    },
  ],
};
