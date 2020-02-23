/* Copyright 2019 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable security/detect-object-injection  */
import { expect } from 'chai';
import lbe2e from 'lb-declarative-e2e-test';
import mqtt from 'mqtt';
import app from '../index';
import testHelper, { clientEvent, timeout } from '../services/test-helper';
// import utils from '../services/utils';

require('../services/broker');

const delayBeforeTesting = 7000;
const restApiPath = `${process.env.REST_API_ROOT}`;
// const restApiPath = `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;

const sensorTest = () => {
  const deviceFactory = testHelper.factories.device;
  const sensorFactory = testHelper.factories.sensor;
  const clientFactory = testHelper.factories.client;
  const loginUrl = `${restApiPath}/Users/login`;
  const collectionName = 'Sensors';
  const apiUrl = `${restApiPath}/${collectionName}/`;
  const sensorsCount = 8;
  const DeviceModel = app.models.Device;
  const SensorModel = app.models.Sensor;
  // const SensorResourceModel = app.models.SensorResource;
  let users, devices, sensors, userIds, packets;

  async function beforeTests() {
    try {
      users = await Promise.all([
        testHelper.access.admin.create(app),
        testHelper.access.user.create(app),
      ]);
      userIds = [users[0].id, users[1].id];

      const deviceModels = await DeviceModel.create(
        Array(2)
          .fill('')
          .map((_, index) =>
            index === 0
              ? deviceFactory(index + 1, userIds[0])
              : deviceFactory(index + 1, userIds[1]),
          ),
      );
      devices = deviceModels.map(model => model.toJSON());

      const sensorTypes = [3300, 3300, 3306, 3303, 3336, 3340, 3341, 3342, 3349];
      const sensorModels = await SensorModel.create(
        Array(sensorsCount)
          .fill('')
          .map((_, index) =>
            index < 2
              ? sensorFactory(index + 1, devices[0], userIds[0])
              : sensorFactory(index + 1, devices[1], userIds[1], sensorTypes[index]),
          ),
      );
      sensors = sensorModels.map(model => model.toJSON());

      const temperaturePacket = {
        topic: `${devices[1].devEui}-out/1/3303/0/1/5700`,
        payload: '35',
      };
      const geolocationPacket = {
        topic: `${devices[1].devEui}-out/1/3336/0/1/5518`,
        payload: +new Date(),
      };
      const schedulerPacket = {
        topic: `${devices[1].devEui}-out/1/3340/0/1/5521`,
        payload: '1200',
      };
      const textPacket = {
        topic: `${devices[1].devEui}-out/1/3341/0/1/5527`,
        payload: 'hey bobby',
      };
      const switchPacket = {
        topic: `${devices[1].devEui}-out/1/3342/0/1/5500`,
        payload: 'false',
      };
      const bitmapPacket = {
        topic: `${devices[1].devEui}-out/1/3349/0/1/5911`,
        payload: 'true',
        // payload: await utils.readFile('../../favicon.ico', null),
      };

      packets = [
        null,
        null,
        null,
        temperaturePacket,
        geolocationPacket,
        schedulerPacket,
        textPacket,
        switchPacket,
        bitmapPacket,
      ];
      return sensors;
    } catch (error) {
      console.log(`[TEST] ${collectionName} before:err`, error);
      return null;
    }
  }

  async function afterTests() {
    return Promise.all([DeviceModel.destroyAll(), app.models.user.destroyAll()]);
  }

  describe(`${collectionName} HTTP`, () => {
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
        before: beforeTests, //  this.timeout(delayBeforeTesting);
        after: afterTests,
        tests: {
          '[TEST] Verifying "Create" access': {
            tests: [
              {
                name: 'everyone CANNOT create',
                verb: 'post',
                url: apiUrl,
                body: () => sensorFactory(sensorsCount, devices[0]),
                expect: 401,
              },
              {
                name: 'user CAN create',
                verb: 'post',
                auth: profiles.user,
                url: apiUrl,
                body: () => sensorFactory(sensorsCount + 1, devices[1], userIds[1]),
                expect: 200,
              },
              {
                name: 'user CAN create OWN resources',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[2].id}/resources`,
                body: () => ({
                  resources: {
                    '5700': 30,
                  },
                }),
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body).to.deep.equal({
                    '5700': 30,
                  });
                },
              },
              {
                name: 'admin CAN create',
                verb: 'post',
                auth: profiles.admin,
                url: apiUrl,
                body: () => sensorFactory(sensorsCount + 2, devices[0], userIds[0]),
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  // expect(resp.body.id).to.be.equal(sensorsCount + 2);
                },
              },
            ],
          },
          '[TEST] Verifying "Read" access': {
            tests: [
              {
                name: 'everyone CANNOT read ONE',
                verb: 'get',
                url: () => `${apiUrl}${sensors[0].id}`,
                expect: 401,
              },
              {
                name: 'everyone CANNOT read ALL',
                verb: 'get',
                url: apiUrl,
                expect: 401,
              },
              {
                name: 'everyone CANNOT read ALL resources',
                verb: 'get',
                url: () => `${apiUrl}${sensors[4].id}/resources`,
                expect: 401,
              },
              {
                name: 'user CAN read OWN',
                verb: 'get',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[4].id}`,
                expect: 200,
              },
              {
                name: 'user CAN read OWN resources',
                verb: 'get',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[4].id}/resources`,
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body).to.deep.equal(sensors[4].resources);
                },
              },
              {
                name: 'user CAN read OWN resources by id',
                verb: 'get',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[3].id}/resources/5700`,
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body).to.deep.equal({ '5700': 0 });
                },
              },
              {
                name: 'admin CAN read ALL',
                verb: 'get',
                auth: profiles.admin,
                url: () => apiUrl,
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  // expect(resp.body[0].id).to.be.equal(sensors[0].id);
                },
              },
            ],
          },
          '[TEST] Verifying "Update" access': {
            tests: [
              {
                name: 'everyone CANNOT update',
                verb: 'patch',
                url: () => `${apiUrl}${sensors[0].id}`,
                body: () => ({ name: `${sensors[0].name} - updated` }),
                expect: 401,
              },
              {
                name: 'user CANNOT update ALL',
                verb: 'patch',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[0].id}`,
                body: () => ({ name: `${sensors[0].name} - updated` }),
                expect: 401,
              },
              {
                name: 'user CAN update OWN',
                verb: 'patch',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[3].id}`,
                body: () => ({ name: `${sensors[3].name} - updated` }),
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.name).to.be.equal(`${sensors[3].name} - updated`);
                },
              },
              {
                name: 'admin CAN update ALL',
                verb: 'patch',
                auth: profiles.admin,
                url: () => `${apiUrl}${sensors[4].id}`,
                body: () => ({ name: `${sensors[4].name} - updated` }),
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.name).to.be.equal(`${sensors[4].name} - updated`);
                },
              },
            ],
          },
          '[TEST] Verifying "Replace" access': {
            tests: [
              {
                name: 'everyone CANNOT replace',
                verb: 'put',
                url: () => `${apiUrl}${sensors[0].id}`,
                body: () => ({
                  ...sensors[0],
                  name: `${sensors[0].name} - replaced`,
                }),
                expect: 401,
              },
              {
                name: 'user CANNOT replace ALL',
                verb: 'put',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[0].id}`,
                body: () => ({
                  ...sensors[0],
                  name: `${sensors[0].name} - replaced`,
                }),
                expect: 401,
              },
              {
                name: 'user CAN replace OWN',
                steps: [
                  {
                    verb: 'get',
                    auth: profiles.user,
                    url: () => `${apiUrl}${sensors[3].id}/resources`,
                    expect: 200,
                  },
                  step0Response => ({
                    verb: 'put',
                    auth: profiles.user,
                    url: () => `${apiUrl}${sensors[3].id}`,
                    body: () => ({
                      ...sensors[3],
                      name: `${sensors[3].name} - replaced`,
                      resources: { ...step0Response.body },
                    }),
                    expect: resp => {
                      expect(resp.status).to.be.equal(200);
                      expect(resp.body.name).to.be.equal(`${sensors[3].name} - replaced`);
                    },
                  }),
                ],
              },
              {
                name: 'user CAN replace OWN resources',
                steps: [
                  {
                    verb: 'get',
                    auth: profiles.user,
                    url: () => `${apiUrl}${sensors[3].id}/resources`,
                    expect: 200,
                  },
                  step0Response => ({
                    verb: 'put',
                    auth: profiles.user,
                    url: () => `${apiUrl}${sensors[3].id}/resources`,
                    body: () => ({
                      resources: {
                        ...step0Response.body,
                        '5700': 30,
                      },
                    }),
                    expect: resp => {
                      expect(resp.status).to.be.equal(200);
                      expect(resp.body).to.deep.equal({
                        ...step0Response.body,
                        '5700': 30,
                      });
                    },
                  }),
                ],
              },
              {
                name: 'admin CAN replace ALL',
                steps: [
                  {
                    verb: 'get',
                    auth: profiles.admin,
                    url: () => `${apiUrl}${sensors[4].id}/resources`,
                    expect: 200,
                  },
                  step0Response => ({
                    verb: 'put',
                    auth: profiles.admin,
                    url: () => `${apiUrl}${sensors[4].id}`,
                    body: () => ({
                      ...sensors[4],
                      name: `${sensors[4].name} - replaced`,
                      resources: { ...step0Response.body },
                    }),
                    expect: resp => {
                      expect(resp.status).to.be.equal(200);
                      expect(resp.body.name).to.be.equal(`${sensors[4].name} - replaced`);
                    },
                  }),
                ],
              },
            ],
          },
          '[TEST] Verifying "Delete" access': {
            tests: [
              {
                name: 'everyone CANNOT delete ALL',
                verb: 'delete',
                url: () => `${apiUrl}${sensors[0].id}`,
                expect: 401,
              },
              {
                name: 'user CAN delete OWN',
                verb: 'delete',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[3].id}`,
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.count).to.be.equal(1);
                },
              },
              {
                name: 'user CAN delete OWN resources',
                verb: 'delete',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[2].id}/resources`,
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                },
              },
              {
                name: 'admin CAN delete ALL',
                verb: 'delete',
                auth: profiles.admin,
                url: () => `${apiUrl}${sensors[4].id}`,
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
                name: 'user CAN search sensors by type',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}search`,
                body: () => ({
                  filter: { text: sensors[0].type.toString() },
                }),
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                },
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
                  sensors,
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
                  sensors,
                  filter: { ownerId: sensors[0].ownerId, name: sensors[0].name },
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
                body: () => {
                  return {
                    device: { ...devices[1] },
                    sensor: {
                      ...sensors[0],
                      value: 10,
                      // resources,
                    },
                    client: {
                      id: users[1].id,
                      user: users[1].id,
                    },
                  };
                },
                expect: 401,
              },
              {
                name: 'User CAN publish',
                steps: [
                  {
                    verb: 'get',
                    auth: profiles.admin,
                    url: () => `${apiUrl}${sensors[0].id}/resources`,
                    expect: 200,
                  },
                  step0Response => ({
                    verb: 'post',
                    auth: profiles.admin,
                    url: () => `${apiUrl}on-publish`,
                    body: () => ({
                      device: { ...devices[1] },
                      sensor: {
                        ...sensors[0],
                        value: 10,
                        resources: { ...step0Response.body },
                      },
                      client: {
                        id: users[1].id,
                        user: users[1].id,
                      },
                    }),
                    expect: resp => {
                      expect(resp.status).to.be.equal(200);
                      // expect(resp.body.name).to.be.equal(`${sensors[3].name} - replaced`);
                    },
                  }),
                ],
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

    before(done => {
      setTimeout(
        () =>
          beforeTests()
            .then(() => done())
            .catch(done),
        2000,
      );
    });

    after(done => {
      setTimeout(
        () =>
          afterTests()
            .then(() => done())
            .catch(done),
        1000,
      );
    });

    // mqtte2e(app, testConfig, e2eTestsSuite);

    it('temperature sensor IS updated after publish', async function() {
      const testMaxDuration = 2000;
      this.timeout(testMaxDuration);
      this.slow(testMaxDuration / 2);
      const index = 3;

      const client = mqtt.connect(
        app.get('mqtt url'),
        clientFactory(devices[1], 'device', devices[1].apiKey),
      );

      await clientEvent(client, 'connect');
      client.publish(packets[index].topic, packets[index].payload, { qos: 1 });

      await timeout(async () => {
        const sensor = await SensorModel.findById(sensors[index].id);
        client.end();
        expect(sensor.value).to.be.equal(Number(packets[index].payload));
      }, 150);
    });

    it('timer sensor IS updated after publish', async function() {
      const testMaxDuration = 2000;
      this.timeout(testMaxDuration);
      this.slow(testMaxDuration / 2);
      const index = 5;

      const client = mqtt.connect(
        app.get('mqtt url'),
        clientFactory(devices[1], 'device', devices[1].apiKey),
      );

      await clientEvent(client, 'connect');
      client.publish(packets[index].topic, packets[index].payload, { qos: 1 });

      await timeout(async () => {
        const sensor = await SensorModel.findById(sensors[index].id);
        client.end();
        expect(sensor.value).to.be.equal(Number(packets[index].payload));
      }, 150);
    });

    it('text sensor IS updated after publish', async function() {
      const testMaxDuration = 2000;
      this.timeout(testMaxDuration);
      this.slow(testMaxDuration / 2);
      const index = 6;

      const client = mqtt.connect(
        app.get('mqtt url'),
        clientFactory(devices[1], 'device', devices[1].apiKey),
      );

      await clientEvent(client, 'connect');
      client.publish(packets[index].topic, packets[index].payload, { qos: 1 });

      await timeout(async () => {
        const sensor = await SensorModel.findById(sensors[index].id);
        client.end();
        expect(sensor.value).to.be.equal(packets[index].payload);
      }, 150);
    });

    it('switch sensor IS updated after publish', async function() {
      const testMaxDuration = 2000;
      this.timeout(testMaxDuration);
      this.slow(testMaxDuration / 2);
      const index = 7;

      const client = mqtt.connect(
        app.get('mqtt url'),
        clientFactory(devices[1], 'device', devices[1].apiKey),
      );

      await clientEvent(client, 'connect');
      client.publish(packets[index].topic, packets[index].payload, { qos: 1 });

      await timeout(async () => {
        const sensor = await SensorModel.findById(sensors[index].id);
        client.end();
        expect(sensor.value.toString()).to.be.equal(packets[index].payload);
      }, 150);
    });
  });
};

setTimeout(() => {
  sensorTest();
  run();
}, delayBeforeTesting * 1.5);
