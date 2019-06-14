/* eslint-disable import/no-extraneous-dependencies */
const mqtt = require('mqtt');

const publishCompleted = () => {
  console.log('publish completed!');
};

const parallel = require('fastparallel')({ released: publishCompleted, results: true });

const clients = [];
let publishers = [];

//  Configurations
const host = 'localhost';
const port = 1883;
const url = 'mqtt://localhost:1883';
const username = '5c96937cc08c0333b7958b6f';
const password = 'Csee4EsVtAGfFMp2bdFMnkBMismpcKqpdt7HXGE5NQRT9H3NOI3zUGnwVlT2FNuC';
const numOfClients = 15000; //  max count of clients
const connectionIntervals = 10; //  interval of connecting to the broker in milliseconds
let numOfConn = 0; //  start number

//  Publish Counter
let counter = 0;
let Totalcnt = 0;
const interval = 1000;

// Publish message {"noOfPub":100} on "${username}/TEST/PubControl" topic. it will start first 100 client to publishing msg/sec
//    Publish message {"noOfPub":1000} on "PubControl" topic. it will increase from 100 to 1000 client to publishing msg/sec
//    Publish message {"noOfPub":"stop"} on "PubControl:" topic. it will stop publishing messages.

function count() {
  if (counter) {
    Totalcnt += counter;
    console.log(`Sent Total=${Totalcnt}, rate=${(counter / interval) * 1000} msg/sec`);
    counter = 0;
  }
}

function done(err, results) {
  console.log('published, results:', results);
}

function parallelPublish(clnt, cb) {
  clients[clnt].publish('5c96937cc08c0333b7958b6f/TEST', 'payload', { qos: 1 }, () => {
    counter += 1;
    cb();
  });
}

function startPublish() {
  setInterval(() => {
    if (publishers.length > 0) {
      parallel(
        {}, // what will be this in the functions
        parallelPublish, // functions to call
        publishers, // the first argument of the functions
        done, // the function to be called when the parallel ends
      );
    }
  }, 1000);
  setInterval(count, interval);
}

function UniqueId(Size) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let j = 0; j < Size; j += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

const createConnections = setInterval(() => {
  numOfConn += 1;
  if (numOfConn > numOfClients) {
    clearInterval(createConnections);
    startPublish();
  } else {
    const options = {
      username,
      password,
      clientId: `userPub24_${username}_${numOfConn}_${UniqueId(10)}`,
    };
    clients[numOfConn] = mqtt.connect(url, options);
    clients[numOfConn].on('connect', () => {
      console.log(new Date(), 'connected', options.clientId);
    });

    clients[numOfConn].on('close', () => {
      console.log(new Date(), 'disconnected:', options.clientId);
      clearInterval(createConnections);
    });
  }
}, connectionIntervals);

const subClient = mqtt.connect({
  port,
  host,
  clean: true,
  keepalive: 0,
  username,
  password,
  clientId: `subForPub_${username}_${UniqueId(5)}`,
});
subClient.on('connect', function() {
  count();
  this.subscribe('5c96937cc08c0333b7958b6f/TEST/PubControl');
  this.on('message', (topic, msg) => {
    const command = JSON.parse(msg.toString()).noOfPub;
    console.log(command, publishers);
    if (command === 'stop') {
      //  publishers = new Array();
      publishers = [];
    } else {
      publishers = [];
      for (let i = 1; i <= command; i += 1) {
        publishers.push(i);
      }
    }
  });
});
