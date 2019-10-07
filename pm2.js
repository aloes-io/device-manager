const dotenv = require('dotenv');
const pm2 = require('pm2');

// if !process.env.ALOES_ID process.env.ALOES_ID = uuid
// if !process.env.ALOES_KEY process.env.ALOES_KEY = uuid

const startAppsList = apps =>
  new Promise((resolve, reject) => {
    pm2.start(apps, (err, list) => (err ? reject(err) : resolve(list)));
  });

const connectPM2 = () =>
  new Promise((resolve, reject) => {
    pm2.connect(err => (err ? reject(err) : resolve(true)));
  });

// const getAppsList = () =>
//   new Promise((resolve, reject) => {
//     pm2.list((err, list) => (err ? reject(err) : resolve(list)));
//   });

const sendMsgToProcessId = (processId, msg) =>
  new Promise((resolve, reject) => {
    pm2.sendDataToProcessId(
      {
        type: 'process:msg',
        data: msg,
        id: processId,
        topic: 'some topic',
      },
      (err, res) => (err ? reject(err) : resolve(res)),
    );
  });

const startBus = () =>
  new Promise((resolve, reject) => {
    pm2.launchBus((err, bus) => (err ? reject(err) : resolve(bus)));
  });

const startProcess = async (noDaemon = true) => {
  try {
    await connectPM2(noDaemon);
    console.log('App has started', noDaemon);

    const config = dotenv.config();
    if (config.error) {
      throw config.error;
    }

    if (config.parsed.INSTANCES_COUNT > 1) {
      process.env.CLUSTER_MODE = true;
    } else {
      // process.env.CLUSTER_MODE = false;
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
          CLUSTER_MODE: process.env.CLUSTER_MODE,
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

    // pm2.disconnect();
    // return;
  } catch (error) {
    console.log('START PROCESS:ERR', error);
    process.exit(2);
    throw error;
  }
};

const stopProcess = processIdentifier => {
  try {
    if (!processIdentifier) {
      processIdentifier = 'all';
    }
    console.log('STOP PROCESS', processIdentifier);
    pm2.stop(processIdentifier, err => {
      if (err) throw err;
      process.exit(0);
    });
  } catch (error) {
    process.exit(2);
    throw error;
  }
};

const deleteProcess = processIdentifier => {
  try {
    if (!processIdentifier) {
      processIdentifier = 'all';
    }
    console.log('DELETE PROCESS', processIdentifier);
    pm2.delete(processIdentifier, err => {
      if (err) throw err;
      process.exit(0);
    });
  } catch (error) {
    process.exit(2);
    throw error;
  }
};

const restartProcess = processIdentifier => {
  try {
    if (!processIdentifier) {
      processIdentifier = 'all';
    }
    console.log('RESTART PROCESS', processIdentifier);
    pm2.restart(processIdentifier, err => {
      if (err) throw err;
      process.exit(0);
    });
  } catch (error) {
    process.exit(2);
    throw error;
  }
};

const reloadProcess = processIdentifier => {
  try {
    if (!processIdentifier) {
      processIdentifier = 'all';
    }
    console.log('RELOAD PROCESS', processIdentifier);
    pm2.gracefulReload(processIdentifier, {}, err => {
      if (err) throw err;
    });
  } catch (error) {
    throw error;
  }
};

const disableDaemon = () => {
  try {
    console.log('DISABLE PM2 DAEMON');
    pm2.kill(err => {
      if (err) throw err;
      process.exit(0);
    });
  } catch (error) {
    process.exit(2);
    throw error;
  }
};

const parseProcessPacket = async packet => {
  try {
    // console.log('PM2 RECEIVED MESSAGE', packet);
    if (packet.process && typeof packet.process.pm_id === 'number') {
      if (packet.data) {
        if (packet.data.isStarted === false) {
          console.log('MESSAGE RECEIVED', packet);
          const message = await sendMsgToProcessId(packet.process.pm_id, {
            ready: true,
          });
          console.log('MESSAGE SENT', message);
        }
      }
    }
  } catch (error) {
    console.log('PARSE PACKET:ERR', error);
    throw error;
  }
};

const logMessage = packet => {
  if (packet.data && packet.data.fullContent) {
    console.log(packet.data.fullContent);
  }
};

const listenProcess = async () => {
  try {
    console.log('LISTEN PROCESS');
    const bus = await startBus();
    bus.on('process:msg', parseProcessPacket);
    bus.on('log:msg', logMessage);
    // return bus;
  } catch (error) {
    console.log('LISTEN PROCESS:ERR', error);
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
