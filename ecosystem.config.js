module.exports = {
  apps: [{
    name: "vetka-glamping",
    script: "./server.js",
    instances: 1, // Node + SQLite shouldn't be scaled across processes since SQLite writes are locked
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000,
    }
  }]
};
