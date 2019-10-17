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
} = require('./pm2-utils');

// if (!process.env.ALOES_ID) process.env.ALOES_ID = uuid
// if (!process.env.ALOES_KEY) process.env.ALOES_KEY = uuid

const startProcess = async (noDaemon = true) => {
  try {
    await connectPM2(noDaemon);
    console.log('App has started');

    const config = dotenv.config();
    if (config.error) {
      throw config.error;
    }

    if (process.env.INSTANCES_COUNT > 1) {
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
        instances: process.env.INSTANCES_COUNT || 1,
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
    ]);
    apps.forEach(app => {
      console.log('APP STARTED', app.pm2_env.pm_id);
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
