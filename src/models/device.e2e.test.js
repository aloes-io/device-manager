/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
import { expect } from 'chai';
import iotAgent from 'iot-agent';
import lbe2e from 'lb-declarative-e2e-test';
import mqtt from 'mqtt';
import app from '../index';
import testHelper, { clientEvent, timeout } from '../lib/test-helper';
import utils from '../lib/utils';

require('../services/broker');

const delayBeforeTesting = 7000;
const restApiPath = `${process.env.REST_API_ROOT}`;
// const restApiPath = `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;

// todo test MQTT connection as mysensors
// test invalid device properties : type, transportProtocol, messageProtocol
// test batch update
// test batch delete
// test to attach device to an application
// test findByPattern & updateFirmware endpoints
// test find with filter
const deviceTest = () => {
  const deviceFactory = testHelper.factories.device;
  const clientFactory = testHelper.factories.client;
  const loginUrl = `${restApiPath}/Users/login`;
  const collectionName = 'Devices';
  const apiUrl = `${restApiPath}/${collectionName}/`;

  const DeviceModel = app.models.Device;
  let devices, users, userIds, packets, patterns;

  async function beforeTests() {
    try {
      users = await Promise.all([
        testHelper.access.admin.create(app),
        testHelper.access.user.create(app),
      ]);
      userIds = [users[0].id, users[1].id];
      const models = Array(5)
        .fill('')
        .map((_, index) =>
          index <= 1 ? deviceFactory(index + 1, userIds[0]) : deviceFactory(index + 1, userIds[1]),
        );
      // console.log('CREATED DEVICES MODELS ', models);
      const res = await DeviceModel.create(models);
      devices = res.map(model => model.toJSON());
      // const packet = { topic: `${devices[0].devEui}-out/`, payload };
      const userPacket = {
        topic: `${users[1].id}/Device/PUT/${devices[1].id}`,
        payload: {
          ...devices[1],
          name: `${devices[1].name}-updated`,
        },
      };
      const devicePacket = {
        topic: `${devices[1].devEui}-out/0/3300/0/1/5700`,
        payload: '0',
      };
      packets = [userPacket, devicePacket];
      patterns = packets.map(pac => iotAgent.patternDetector(pac));
      return devices;
    } catch (error) {
      console.log(`[TEST] ${collectionName} before:err`, error);
      return null;
    }
  }

  async function afterTests() {
    return Promise.all([DeviceModel.destroyAll(), app.models.user.destroyAll()]);
  }
  describe(`${collectionName}`, () => {
    before(async () => {
      return beforeTests();
    });

    after(async () => {
      return afterTests();
    });
    describe(`${collectionName} HTTP`, function() {
      this.timeout(7000);
      this.slow(500);

      const profiles = {
        admin: {
          email: testHelper.access.admin.profile.email,
          password: testHelper.access.admin.profile.password,
        },
        user: {
          email: testHelper.access.user.profile.email,
          password: testHelper.access.user.profile.password,
        },
      };

      const e2eTestsSuite = {
        [`[TEST] ${collectionName} E2E Tests`]: {
          tests: {
            '[TEST] Verifying "Create" access': {
              tests: [
                {
                  name: 'everyone CANNOT create',
                  verb: 'post',
                  url: apiUrl,
                  body: deviceFactory(6),
                  expect: 401,
                },
                {
                  name: 'user CAN create',
                  verb: 'post',
                  auth: profiles.user,
                  url: apiUrl,
                  body: deviceFactory(7),
                  expect: 200,
                },
                {
                  name: 'admin CAN create',
                  verb: 'post',
                  auth: profiles.admin,
                  url: apiUrl,
                  body: deviceFactory(8),
                  expect: 200,
                },
              ],
            },
            '[TEST] Verifying "Read" access': {
              tests: [
                {
                  name: 'everyone CANNOT read ONE',
                  verb: 'get',
                  url: () => `${apiUrl}${devices[0].id}`,
                  expect: 401,
                },
                {
                  name: 'everyone CANNOT read ALL',
                  verb: 'get',
                  url: apiUrl,
                  expect: 401,
                },
                {
                  name: 'everyone CAN read OWN',
                  verb: 'get',
                  auth: profiles.user,
                  url: () => `${apiUrl}${devices[2].id}`,
                  expect: 200,
                },
                {
                  name: 'everyone CAN read OWN with sensors',
                  verb: 'get',
                  auth: profiles.user,
                  url: () => `${apiUrl}${devices[2].id}?filter[include]=sensors`,
                  expect: 200,
                },
                {
                  name: 'admin CAN read ALL',
                  verb: 'get',
                  auth: profiles.admin,
                  url: () => apiUrl,
                  expect: 200,
                },
              ],
            },
            '[TEST] Verifying "Update" access': {
              tests: [
                {
                  name: 'everyone CANNOT update',
                  verb: 'patch',
                  url: () => apiUrl + devices[0].id,
                  body: () => ({ name: `${devices[0].name} - updated` }),
                  expect: 401,
                },
                {
                  name: 'user CANNOT update ALL',
                  verb: 'patch',
                  auth: profiles.user,
                  url: () => `${apiUrl}${devices[0].id}`,
                  body: () => ({ name: `${devices[0].name} - updated` }),
                  expect: 401,
                },
                {
                  name: 'user CAN update OWN',
                  verb: 'patch',
                  auth: profiles.user,
                  url: () => `${apiUrl}${devices[2].id}`,
                  body: () => ({ name: `${devices[2].name} - updated` }),
                  expect: resp => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body.name).to.be.equal(`${devices[2].name} - updated`);
                  },
                },
                {
                  name: 'admin CAN update ALL',
                  verb: 'patch',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${devices[2].id}`,
                  body: () => ({ name: `${devices[2].name} - updated` }),
                  expect: resp => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body.name).to.be.equal(`${devices[2].name} - updated`);
                  },
                },
              ],
            },
            '[TEST] Verifying "Replace" access': {
              tests: [
                {
                  name: 'everyone CANNOT replace',
                  verb: 'put',
                  url: () => apiUrl + devices[0].id,
                  body: () => ({
                    ...devices[0],
                    name: `${devices[0].name} - replaced`,
                  }),
                  expect: 401,
                },
                {
                  name: 'user CANNOT replace ALL',
                  verb: 'put',
                  auth: profiles.user,
                  url: () => `${apiUrl}${devices[0].id}`,
                  body: () => ({
                    ...devices[0],
                    name: `${devices[0].name} - replaced`,
                  }),
                  expect: 401,
                },
                {
                  name: 'user CAN replace OWN',
                  verb: 'put',
                  auth: profiles.user,
                  url: () => `${apiUrl}${devices[2].id}`,
                  body: () => ({
                    ...devices[2],
                    name: `${devices[2].name} - replaced`,
                  }),
                  expect: resp => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body.name).to.be.equal(`${devices[2].name} - replaced`);
                  },
                },
                {
                  name: 'admin CAN replace ALL',
                  verb: 'put',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${devices[2].id}`,
                  body: () => ({
                    ...devices[2],
                    name: `${devices[2].name} - replaced`,
                  }),
                  expect: resp => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body.name).to.be.equal(`${devices[2].name} - replaced`);
                  },
                },
              ],
            },
            '[TEST] Verifying "Delete" access': {
              tests: [
                {
                  name: 'everyone CANNOT delete ALL',
                  verb: 'delete',
                  url: () => `${apiUrl}${devices[0].id}`,
                  expect: 401,
                },
                {
                  name: 'user CAN delete OWN',
                  verb: 'delete',
                  auth: profiles.user,
                  url: () => `${apiUrl}${devices[2].id}`,
                  expect: resp => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body.count).to.be.equal(1);
                  },
                },
                {
                  name: 'admin CAN delete ALL',
                  verb: 'delete',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${devices[3].id}`,
                  expect: resp => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body.count).to.be.equal(1);
                  },
                },
              ],
            },
            '[TEST] Verifying "Search" access': {
              tests: [
                {
                  name: 'everyone CANNOT search devices',
                  verb: 'post',
                  url: () => `${apiUrl}search`,
                  body: () => ({
                    filter: { text: 0 },
                  }),
                  expect: resp => {
                    expect(resp.status).to.be.equal(401);
                  },
                },
                {
                  name: 'user CANNOT search devices with invalid input',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}search`,
                  body: () => ({
                    filter: { text: 0 },
                  }),
                  expect: resp => {
                    expect(resp.status).to.be.equal(400);
                  },
                },
                {
                  name: 'user CAN search devices by type with limit',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}search`,
                  body: () => ({
                    filter: { text: 'aloes', limit: 2 },
                  }),
                  expect: resp => {
                    expect(resp.status).to.be.equal(200);
                  },
                },
                {
                  name: 'user CAN search devices by address',
                  steps: [
                    {
                      verb: 'post',
                      auth: profiles.user,
                      url: '/api/Addresses/verify',
                      body: {
                        address: {
                          city: 'Nantes',
                          postalCode: '44000',
                          street: '92 rue paul bellamy',
                        },
                      },
                      expect: 200,
                    },
                    step0Response => ({
                      verb: 'put',
                      auth: profiles.user,
                      url: () => `${apiUrl}${devices[4].id}/address`,
                      body: () => ({
                        ...step0Response.body,
                        public: true,
                      }),
                      expect: 200,
                    }),
                    step1Response => ({
                      verb: 'post',
                      auth: profiles.user,
                      url: () => `${apiUrl}search`,
                      body: () => ({
                        filter: { text: step1Response.body.city },
                      }),
                      expect: resp => {
                        expect(resp.status).to.be.equal(200);
                      },
                    }),
                  ],
                },
                {
                  name: 'user CAN search devices by coordinates',
                  steps: [
                    {
                      verb: 'post',
                      auth: profiles.admin,
                      url: '/api/Addresses/verify',
                      body: {
                        address: {
                          city: 'Nantes',
                          postalCode: '44000',
                          street: '95 rue paul bellamy',
                        },
                      },
                      expect: 200,
                    },
                    step0Response => ({
                      verb: 'put',
                      auth: profiles.admin,
                      url: () => `${apiUrl}${devices[1].id}/address`,
                      body: () => ({
                        ...step0Response.body,
                        public: true,
                      }),
                      expect: 200,
                    }),
                    step1Response => ({
                      verb: 'post',
                      auth: profiles.admin,
                      url: () => `${apiUrl}geo-locate`,
                      body: () => ({
                        filter: {
                          location: step1Response.body.coordinates,
                          maxDistance: 50,
                          unit: 'km',
                        },
                      }),
                      expect: 200,
                    }),
                  ],
                },
              ],
            },
            '[TEST] Verifying "Export" access': {
              tests: [
                {
                  name: 'user CAN export to CSV',
                  auth: profiles.user,
                  verb: 'post',
                  url: () => `${apiUrl}export`,
                  body: () => ({
                    devices,
                    filter: {},
                  }),
                  expect: resp => {
                    expect(resp.status).to.be.equal(200);
                  },
                },
                {
                  name: 'user CAN export to CSV',
                  auth: profiles.user,
                  verb: 'post',
                  url: () => `${apiUrl}export`,
                  body: () => ({
                    devices,
                    filter: { ownerId: devices[0].ownerId, name: devices[0].name },
                  }),
                  expect: 200,
                },
              ],
            },
            '[TEST] Verifying "Publish" access': {
              tests: [
                {
                  name: 'everyone CANNOT publish',
                  verb: 'post',
                  url: () => `${apiUrl}on-publish`,
                  body: () => ({
                    packet: { ...packets[0] },
                    pattern: { ...patterns[0] },
                    client: {
                      id: users[1].id,
                      user: users[1].id,
                    },
                  }),
                  expect: 401,
                },
                {
                  name: 'User CAN publish',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}on-publish`,
                  body: () => ({
                    packet: packets[0],
                    pattern: patterns[0],
                    client: {
                      id: users[1].id,
                      user: users[1].id,
                    },
                  }),
                  expect: 200,
                },
                {
                  name: "user CAN update its device's status",
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}update-status`,
                  body: () => ({
                    client: {
                      id: devices[0].devEui,
                      devEui: devices[0].devEui,
                      user: devices[0].id,
                    },
                    status: true,
                  }),
                  expect: 200,
                },
                {
                  name: 'device CAN update its status',
                  steps: [
                    {
                      verb: 'post',
                      url: () => `${apiUrl}authenticate`,
                      body: () => ({
                        deviceId: devices[0].id.toString(),
                        key: devices[0].apiKey,
                      }),
                      expect: 200,
                    },
                    () => ({
                      verb: 'post',
                      headers: {
                        'accept-encoding': 'gzip, deflate',
                        'user-agent': 'node-superagent/3.8.3',
                        deveui: devices[0].devEui,
                        apikey: devices[0].apiKey,
                      },
                      url: () => `${apiUrl}update-status`,
                      body: () => ({
                        client: {
                          id: devices[0].devEui,
                          devEui: devices[0].devEui,
                          user: devices[0].id,
                        },
                        status: true,
                      }),
                      expect: 200,
                    }),
                  ],
                },
                {
                  name: 'device CAN read its state',
                  steps: [
                    {
                      verb: 'post',
                      url: () => `${apiUrl}authenticate`,
                      body: () => ({
                        deviceId: devices[0].id.toString(),
                        key: devices[0].apiKey,
                      }),
                      expect: 200,
                    },
                    () => ({
                      verb: 'get',
                      headers: {
                        'accept-encoding': 'gzip, deflate',
                        'user-agent': 'node-superagent/3.8.3',
                        deveui: devices[0].devEui,
                        apikey: devices[0].apiKey,
                      },
                      url: () => `${apiUrl}get-state/${devices[0].id}`,
                      expect: 200,
                    }),
                  ],
                },
                {
                  name: 'device CAN read its full state (with sensors and address)',
                  steps: [
                    {
                      verb: 'post',
                      url: () => `${apiUrl}authenticate`,
                      body: () => ({
                        deviceId: devices[0].id.toString(),
                        key: devices[0].apiKey,
                      }),
                      expect: 200,
                    },
                    () => ({
                      verb: 'get',
                      headers: {
                        'accept-encoding': 'gzip, deflate',
                        'user-agent': 'node-superagent/3.8.3',
                        deveui: devices[0].devEui,
                        apikey: devices[0].apiKey,
                      },
                      url: () => `${apiUrl}get-full-state/${devices[0].id}`,
                      expect: 200,
                    }),
                  ],
                },
              ],
            },
            '[TEST] Verifying "Authentification" access': {
              tests: [
                {
                  name: 'everyone CAN authenticate',
                  verb: 'post',
                  url: () => `${apiUrl}authenticate`,
                  body: () => ({
                    deviceId: devices[0].id.toString(),
                    key: devices[0].apiKey,
                  }),
                  expect: 200,
                },
                {
                  name: 'everyone CANNOT refresh API Key',
                  verb: 'post',
                  url: () => `${apiUrl}refresh-token/${devices[0].id}`,
                  expect: 401,
                },
                {
                  name: "user CANNOT refresh another OWNER devices's API Key",
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}refresh-token/${devices[0].id}`,
                  expect: 401,
                },
                {
                  name: 'user CAN refresh API Key',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}refresh-token/${devices[4].id}`,
                  expect: 200,
                },
              ],
            },
          },
        },
      };

      const testConfig = {
        auth: { url: loginUrl },
      };

      lbe2e(app, testConfig, e2eTestsSuite);
    });

    describe(`${collectionName} MQTT`, function() {
      this.timeout(delayBeforeTesting);

      it('everyone CANNOT connect to backend', function(done) {
        const testMaxDuration = 2000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);

        const client = mqtt.connect(app.get('mqtt url'));
        client.once('error', e => {
          expect(e.code).to.be.equal(4);
          client.end(() => {
            done();
          });
        });
        client.once('connect', () => {
          client.end(() => {
            done(new Error('Should not connect'));
          });
        });
      });

      it('device CANNOT connect with wrong credentials', function(done) {
        const testMaxDuration = 2000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);
        const client = mqtt.connect(
          app.get('mqtt url'),
          clientFactory(devices[1], 'device', devices[0].apiKey),
        );

        client.once('error', e => {
          expect(e.code).to.be.equal(4);
          client.end(() => {
            done();
          });
        });

        client.once('connect', () => {
          // client.end(true);
          client.end(() => {
            done(new Error('Should not connect'));
          });
        });
      });

      it('device CAN connect and its status is updated accordingly', async function() {
        const testMaxDuration = 2500;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);
        const client = mqtt.connect(
          app.get('mqtt url'),
          clientFactory(devices[1], 'device', devices[1].apiKey),
        );

        const packet = await clientEvent(client, 'connect');
        expect(packet.returnCode).to.be.equal(0);
        await timeout(async () => {
          const device = await utils.findById(DeviceModel, devices[1].id);
          expect(device.status).to.be.equal(true);
          client.end(true);
        }, 250);

        return timeout(async () => {
          const device = await utils.findById(DeviceModel, devices[1].id);
          expect(device.status).to.be.equal(false);
        }, 350);
      });

      it('device CANNOT publish to ANY route', function(done) {
        const testMaxDuration = 3000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);
        const client = mqtt.connect(
          app.get('mqtt url'),
          clientFactory(devices[0], 'device', devices[0].apiKey),
        );

        client.once('error', e => {
          console.log('client error:', e);
        });

        client.once('offline', () => {
          client.end(true, () => {
            done();
          });
        });

        client.once('connect', () => {
          client.publish('FAKETOPIC', packets[1].payload, { qos: 1 });
          // client.end(true);
          // done();
          client.end(true, () => {
            done();
          });
        });

        // done(new Error('Should have ended with an error event'));
      });

      it('device CAN publish to OWN route', function(done) {
        const testMaxDuration = 3000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);
        const client = mqtt.connect(
          app.get('mqtt url'),
          clientFactory(devices[1], 'device', devices[1].apiKey),
        );

        client.once('error', e => {
          done(e);
        });

        client.once('offline', () => {
          client.end(true, () => {
            done(new Error('Should not been offlined'));
          });
        });

        client.once('connect', () => {
          client.publish(packets[1].topic, packets[1].payload, { qos: 1 });
          client.end(() => {
            done();
          });
        });
      });

      it('device CAN present new sensor', async function() {
        const testMaxDuration = 2000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);

        const client = mqtt.connect(
          app.get('mqtt url'),
          clientFactory(devices[1], 'device', devices[1].apiKey),
        );

        const packet = {
          topic: `${devices[1].devEui}-out/0/3340/0/1/5850`,
          payload: 'true',
        };

        await clientEvent(client, 'connect');
        client.publish(packet.topic, packet.payload, { qos: 1 });

        await timeout(async () => {
          const device = await utils.findById(DeviceModel, devices[1].id);
          const sensors = await device.sensors.find();
          expect(sensors.some(sensor => sensor.type === 3340)).to.be.equal(true);
          client.end(true);
        }, 150);
      });
    });
  });
};

setTimeout(() => {
  deviceTest();
  run();
}, delayBeforeTesting * 1.5);
