const pm2 = require('pm2');

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

module.exports = {
  startAppsList,
  connectPM2,
  stopProcess,
  deleteProcess,
  restartProcess,
  reloadProcess,
  disableDaemon,
  logMessage,
  listenProcess,
};
