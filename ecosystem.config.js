/* eslint-disable camelcase */
const dotenv = require('dotenv');

const result = dotenv.config();
if (result.error) {
  throw result.error;
}
// if !process.env.ALOES_ID process.env.ALOES_ID = uuid
// if !process.env.ALOES_KEY process.env.ALOES_KEY = uuid

module.exports = {
  apps: [
    {
      // name: `${result.parsed.NODE_NAME}-${result.parsed.NODE_ENV}`,
      name: `device-manager`,
      script: './dist/index.js',
      interpreter: 'node',
      output: `./log/${result.parsed.NODE_NAME}-${result.parsed.NODE_ENV}.out.log`,
      error: `./log/${result.parsed.NODE_NAME}-${result.parsed.NODE_ENV}.error.log`,
      max_memory_restart: '1G',
      instances: result.parsed.INSTANCES_COUNT || 1,
      exec_mode: 'cluster',
      restart_delay: 2000,
      wait_ready: false,
      listen_timeout: 3000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: result.parsed.NODE_ENV,
      },
      env_staging: {
        NODE_ENV: 'staging',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      // name: `broker-${result.parsed.NODE_ENV}`,
      name: `broker`,
      script: './dist/services/broker.js',
      interpreter: 'node',
      max_memory_restart: '1G',
      restart_delay: 1000,
      wait_ready: false,
      listen_timeout: 3000,
      kill_timeout: 2500,
      env: {
        NODE_ENV: result.parsed.NODE_ENV,
      },
    },
    {
      // name: `tunnel-${result.parsed.NODE_ENV}`,
      name: `tunnel`,
      script: './dist/services/tunnel.js',
      interpreter: 'node',
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 3,
      restart_delay: 5000,
      wait_ready: false,
      listen_timeout: 3000,
      kill_timeout: 1500,
      env: {
        NODE_ENV: result.parsed.NODE_ENV,
      },
    },
  ],
  deploy: {
    staging: {
      //  key: '~/.ssh/server4',
      user: `${result.parsed.VPS_USER}`,
      host: [result.parsed.VPS_HOST],
      ssh_options: ['Port=22', 'StrictHostKeyChecking=yes'],
      ref: `origin/staging`,
      repo: result.parsed.GIT_REPO_SSH_URL,
      path: `/home/${result.parsed.VPS_USER}/${result.parsed.NODE_NAME}-${result.parsed.NODE_ENV}`,
      'pre-setup': '',
      'pre-deploy-local': `scp -P 22 deploy/.env_${result.parsed.NODE_ENV} ${
        result.parsed.VPS_USER
      }@${result.parsed.VPS_HOST}:/home/${result.parsed.VPS_USER}/${result.parsed.NODE_NAME}-${
        result.parsed.NODE_ENV
      }/source/.env`,
      'post-deploy': 'npm install && npm run deploy:stage',
    },
    production: {
      key: '~/.ssh/server4',
      user: `${result.parsed.VPS_USER}`,
      host: [result.parsed.VPS_HOST],
      ssh_options: ['Port=22', 'StrictHostKeyChecking=yes'],
      ref: `origin/master`,
      repo: result.parsed.GIT_REPO_SSH_URL,
      path: `/home/${result.parsed.VPS_USER}/${result.parsed.NODE_NAME}`,
      'pre-setup': '',
      'pre-deploy-local': `scp -P 22 deploy/.env_${result.parsed.NODE_ENV} ${
        result.parsed.VPS_USER
      }@${result.parsed.VPS_HOST}:/home/${result.parsed.VPS_USER}/${
        result.parsed.NODE_NAME
      }/source/.env`,
      'post-deploy': 'npm install && npm run deploy:prod',
    },
  },
};
