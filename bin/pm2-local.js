/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable security/detect-object-injection  */
const dotenv = require('dotenv');
const {
  startAppsList,
  connectPM2,
  stopProcess,
  deleteProcess,
  restartProcess,
  reloadProcess,
  disableDaemon,
  listenProcess,
  sendMsgToProcessId,
} = require('./pm2-utils');

// if (!process.env.ALOES_ID) process.env.ALOES_ID = uuid
// if (!process.env.ALOES_KEY) process.env.ALOES_KEY = uuid

// const getAppsList = () =>
//   new Promise((resolve, reject) => {
//     pm2.list((err, list) => (err ? reject(err) : resolve(list)));
//   });

const startProcess = async (noDaemon = true) => {
  try {
    await connectPM2(noDaemon);
    const envPath = `${__dirname}/../.env`;
    console.log('App has started', envPath);
    // const config = dotenv.config();
    const config = dotenv.config({ path: envPath });
    if (config.error) {
      throw config.error;
    }

    if (config.parsed.INSTANCES_COUNT > 1) {
      process.env.CLUSTER_MODE = true;
    }

    const apps = await startAppsList([
      {
        // name: `${config.parsed.NODE_NAME}-${config.parsed.NODE_ENV}`,
        name: `device-manager`,
        script: './dist/index.js',
        interpreter: 'node',
        // output: `./log/${config.parsed.NODE_NAME}-${config.parsed.NODE_ENV}.out.log`,
        // error: `./log/${config.parsed.NODE_NAME}-${config.parsed.NODE_ENV}.error.log`,
        output: '/dev/null',
        error: '/dev/null',
        maxMemoryRestart: '1G',
        instances: config.parsed.INSTANCES_COUNT || 1,
        execMode: 'cluster',
        restartDelay: 2000,
        waitReady: false,
        listenTimeout: 3000,
        killTimeout: 5000,
        env: {
          NODE_ENV: config.parsed.NODE_ENV,
          CLUSTER_MODE: process.env.CLUSTER_MODE,
        },
        envStaging: {
          NODE_ENV: 'staging',
        },
        envProduction: {
          NODE_ENV: 'production',
        },
      },
      {
        // name: `broker-${config.parsed.NODE_ENV}`,
        name: `broker`,
        script: './dist/services/broker.js',
        interpreter: 'node',
        maxMemoryRestart: '1G',
        restartDelay: 1000,
        waitReady: false,
        listenTimeout: 3000,
        killTimeout: 2500,
        env: {
          NODE_ENV: config.parsed.NODE_ENV,
          // CLUSTER_MODE: process.env.CLUSTER_MODE,
        },
      },
      {
        // name: `tunnel-${config.parsed.NODE_ENV}`,
        name: `tunnel`,
        script: './dist/services/tunnel.js',
        interpreter: 'node',
        maxMemoryRestart: '512M',
        minUptime: '10s',
        maxRestarts: 3,
        restartDelay: 5000,
        waitReady: false,
        listenTimeout: 3000,
        killTimeout: 1500,
        env: {
          NODE_ENV: config.parsed.NODE_ENV,
        },
      },
    ]);

    apps.forEach(app => {
      console.log('APP STARTED', app.pm2_env.pm_id);
    });

    process.on('SIGINT', () => {
      console.log('STOPPING PROCESS', 'SIGINT');
      apps.forEach(app => {
        sendMsgToProcessId(app.pm2_env.pm_id, {
          stopped: true,
        })
          .then(msg => {
            console.log('APP STOPPED', app.pm2_env.pm_id);
            setTimeout(() => stopProcess(app.pm2_env.pm_id), 5000);
            return msg;
          })
          .catch(e => {
            console.log('APP STOPPED:ERR', e);
          });
      });
    });

    process.on('SIGTERM', () => {
      console.log('STOP PROCESS', 'SIGTERM');
    });

    // pm2.disconnect();
    // return;
  } catch (error) {
    console.log('START PROCESS:ERR', error);
    process.exit(2);
    throw error;
  }
};

// for (let i = 2; i < process.argv.length; i += 1) {
for (let i = 2; i < 5; i += 1) {
  if (process.argv[i] && process.argv[i].startsWith('--')) {
    const command = process.argv[i];
    // console.log(command);
    const arg = process.argv[i + 1] || false;
    switch (command) {
      case '--start':
        startProcess(arg);
        listenProcess();
        break;
      case '--stop':
        stopProcess(arg);
        break;
      case '--delete':
        deleteProcess(arg);
        break;
      case '--reload':
        reloadProcess(arg);
        listenProcess();
        break;
      case '--restart':
        restartProcess(arg);
        listenProcess();
        break;
      case '--disable':
        disableDaemon();
        break;
      default:
        console.log('UNKNOW COMMAND');
    }
  }
}
