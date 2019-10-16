/* eslint-disable import/no-extraneous-dependencies */
const mqtt = require('mqtt');

const clients = [];

//  Configurations
//  const host = 'localhost';
//  const port = 1883;
const url = 'mqtt://localhost:1883';
// todo populate with dotenv ALOES_ID & ALOES_KEY
const username = '5c96937cc08c0333b7958b6f';
const password = 'Csee4EsVtAGfFMp2bdFMnkBMismpcKqpdt7HXGE5NQRT9H3NOI3zUGnwVlT2FNuC';

const numOfClients = 1;
const connectionIntervals = 10; //  in milliseconds
let numOfConn = 0;

//  Subscribe Counter
let counter = 0;
let Totalcnt = 0;
const interval = 1000;

function count() {
  Totalcnt += counter;
  console.log(`Receive Total=${Totalcnt} , rate=${(counter / interval) * 1000} msg/sec`);
  counter = 0;
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
  } else {
    const options = {
      username,
      password,
      clientId: `subUser_${username}_${numOfConn}_${UniqueId(10)}`,
    };
    clients[numOfConn] = mqtt.connect(url, options);
    clients[numOfConn].on('connect', function() {
      console.log(new Date(), 'connected', options.clientId);
      //  this.subscribe('channel_'+options.clientId.split('_')[1])
      this.subscribe('5c96937cc08c0333b7958b6f/#', { qos: 1 });
      this.on('message', topic => {
        console.log(new Date(), 'message:', topic);
        counter += 1;
      });
    });

    clients[numOfConn].on('close', () => {
      console.log(new Date(), 'disconnected:', options.clientId);
      clearInterval(createConnections);
    });
  }
}, connectionIntervals);

setInterval(count, interval);
