/* eslint-disable camelcase */
const dotenv = require('dotenv');

const result = dotenv.config();
if (result.error) {
  throw result.error;
}

module.exports = {
  apps: [
    {
      name: `${result.parsed.NODE_NAME}-${result.parsed.NODE_ENV}`,
      script: './dist/index.js',
      interpreter: 'node',
      output: `./log/${result.parsed.NODE_NAME}.out.log`,
      error: `./log/${result.parsed.NODE_NAME}.error.log`,
      max_memory_restart: '1G',
      instances: result.parsed.INSTANCES_COUNT || 1,
      exec_mode: 'cluster',
      restart_delay: 500,
      wait_ready: false,
      listen_timeout: 3000,
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
      }@${result.parsed.VPS_HOST}:/home/${result.parsed.VPS_USER}/${
        result.parsed.NODE_NAME
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
