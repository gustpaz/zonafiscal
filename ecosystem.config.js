module.exports = {
  apps: [{
    name: 'zonafiscal',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/zonafiscal',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/zonafiscal/error.log',
    out_file: '/var/log/zonafiscal/out.log',
    log_file: '/var/log/zonafiscal/combined.log',
    time: true
  }]
};
