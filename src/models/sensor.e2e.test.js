/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable security/detect-object-injection  */
/* eslint-disable security/detect-non-literal-fs-filename  */

import chai, { expect } from 'chai';
import chaiDeepMatch from 'chai-deep-match';
import lbe2e from 'lb-declarative-e2e-test';
import mqttTest from 'mqtt-declarative-e2e-test';
// import mqtt from 'mqtt';
import app from '../index';
import testHelper from '../lib/test-helper';
import utils from '../lib/utils';

require('../services/broker');

chai.use(chaiDeepMatch);

const delayBeforeTesting = 7000;
const restApiPath = `${process.env.REST_API_ROOT}`;
// const restApiPath = `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;

// todo test invalid sensor properties : type, resource, transportProtocol, messageProtocol
// test single / batch update with resources property
// test batch delete
// test sensor update / delete via user MQTT client
// test invalid method via user MQTT client
const sensorTest = () => {
  const {
    client: clientFactory,
    device: deviceFactory,
    sensor: sensorFactory,
  } = testHelper.factories;
  const loginUrl = `${restApiPath}/Users/login`;
  const collectionName = 'Sensors';
  const apiUrl = `${restApiPath}/${collectionName}/`;
  const sensorsCount = 8;
  const {
    Device: DeviceModel,
    Sensor: SensorModel,
    SensorResource: SensorResourceModel,
    Scheduler: SchedulerModel,
  } = app.models;
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
      devices = deviceModels.map((model) => model.toJSON());

      const sensorTypes = [null, 3306, 3303, 3336, 3340, 3341, 3342, 3349];
      const sensorModels = await SensorModel.create(
        Array(sensorsCount)
          .fill('')
          .map((_, index) =>
            index < 1
              ? sensorFactory(index + 1, devices[0], userIds[0])
              : sensorFactory(index + 1, devices[1], userIds[1], sensorTypes[index]),
          ),
      );
      sensors = sensorModels.map((model) => model.toJSON());
      // console.log('created sensors', sensors);

      // TODO test more sensor types
      const temperaturePacket = {
        topic: `${devices[1].devEui}-out/1/3303/0/1/5700`,
        payload: '35',
      };
      const geolocationPacket = {
        topic: `${devices[1].devEui}-out/1/3336/0/1/5518`,
        payload: `${+new Date()}`,
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
        topic: `${devices[1].devEui}-out/0/3349/0/1/5911`,
        payload: 'true',
      };

      packets = [
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

  describe(`${collectionName}`, () => {
    before(async () => {
      return beforeTests();
    });

    after(async () => {
      return afterTests();
    });

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
                  name: 'everyone CANNOT create resources',
                  verb: 'post',
                  url: () => `${apiUrl}${sensors[1].id}/resources`,
                  body: () => ({
                    resources: {
                      '5700': 30,
                    },
                  }),
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
                  url: () => `${apiUrl}${sensors[1].id}/resources`,
                  body: () => ({
                    resources: {
                      '5700': 30,
                    },
                  }),
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body).to.deep.equal({
                      '5700': 30,
                    });
                  },
                },
                {
                  name: 'user CAN create OWN measurements',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}${sensors[1].id}/measurements`,
                  body: () => ({
                    value: 30,
                    timestamp: Date.now(),
                    type: sensors[1].type.toString(),
                    resource: sensors[1].resource.toString(),
                  }),
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body).to.deep.match({
                      value: 30,
                      type: sensors[1].type.toString(),
                      resource: sensors[1].resource.toString(),
                      sensorId: sensors[1].id,
                      deviceId: sensors[1].deviceId,
                      nativeSensorId: sensors[1].nativeSensorId,
                      nativeNodeId: sensors[1].nativeNodeId,
                    });
                  },
                },
                {
                  name: 'admin CAN create',
                  verb: 'post',
                  auth: profiles.admin,
                  url: apiUrl,
                  body: () => sensorFactory(sensorsCount + 2, devices[0], userIds[0]),
                  expect: (resp) => {
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
                  name: 'everyone CANNOT read ALL measurements',
                  verb: 'get',
                  url: () => `${apiUrl}${sensors[4].id}/measurements`,
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
                  url: () => `${apiUrl}${sensors[2].id}/resources`,
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body).to.deep.equal(sensors[2].resources);
                  },
                },
                {
                  name: 'user CAN read OWN resources by id',
                  verb: 'get',
                  auth: profiles.user,
                  url: () => `${apiUrl}${sensors[1].id}/resources/5700`,
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body).to.deep.equal({ '5700': 30 });
                  },
                },
                {
                  name: 'user CAN read OWN measurements',
                  verb: 'get',
                  auth: profiles.user,
                  url: () => `${apiUrl}${sensors[1].id}/measurements`,
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                    // console.log('user CAN read OWN measurements', resp.body);
                    const baseMeasurement = {
                      ownerId: sensors[1].ownerId.toString(),
                      deviceId: sensors[1].deviceId.toString(),
                      nativeNodeId: sensors[1].nativeNodeId,
                      nativeSensorId: sensors[1].nativeSensorId,
                      sensorId: sensors[1].id.toString(),
                      type: sensors[1].type.toString(),
                      value: 30,
                    };
                    expect(resp.body).to.deep.match([baseMeasurement]);
                  },
                },
                {
                  name: 'admin CAN read ALL',
                  verb: 'get',
                  auth: profiles.admin,
                  url: () => apiUrl,
                  expect: (resp) => {
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
                  expect: (resp) => {
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
                  expect: (resp) => {
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
                    (step0Response) => ({
                      verb: 'put',
                      auth: profiles.user,
                      url: () => `${apiUrl}${sensors[3].id}`,
                      body: () => ({
                        ...sensors[3],
                        name: `${sensors[3].name} - replaced`,
                        resources: { ...step0Response.body },
                      }),
                      expect: (resp) => {
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
                    (step0Response) => ({
                      verb: 'put',
                      auth: profiles.user,
                      url: () => `${apiUrl}${sensors[3].id}/resources`,
                      body: () => ({
                        resources: {
                          ...step0Response.body,
                          '5700': 30,
                        },
                      }),
                      expect: (resp) => {
                        expect(resp.status).to.be.equal(200);
                        expect(resp.body).to.deep.equal({
                          ...step0Response.body,
                          '5700': 30,
                        });
                      },
                    }),
                  ],
                },
                // {
                //   name: 'user CAN replace OWN measurements',
                //   steps: [
                //     {
                //       verb: 'get',
                //       auth: profiles.user,
                //       url: () => `${apiUrl}${sensors[1].id}/measurements`,
                //       expect: 200,
                //     },
                //     step0Response => ({
                //       verb: 'put',
                //       auth: profiles.user,
                //       url: () => `${apiUrl}${sensors[1].id}/measurements`,
                //       body: () => ({
                //         attributes: {
                //           value: 30,
                //           timestamp: new Date(),
                //         },
                //         filter: {
                //           where: {
                //             type: sensors[1].type.toString(),
                //             resource: sensors[1].resource.toString(),
                //           },
                //         },
                //       }),
                //       expect: resp => {
                //         expect(resp.status).to.be.equal(200);
                //         console.log('user CAN replace OWN measurements', resp.body);
                //         // expect(resp.body).to.deep.equal({
                //         //   ...step0Response.body,
                //         //   '5700': 30,
                //         // });
                //       },
                //     }),
                //   ],
                // },
                {
                  name: 'admin CAN replace ALL',
                  steps: [
                    {
                      verb: 'get',
                      auth: profiles.admin,
                      url: () => `${apiUrl}${sensors[4].id}/resources`,
                      expect: 200,
                    },
                    (step0Response) => ({
                      verb: 'put',
                      auth: profiles.admin,
                      url: () => `${apiUrl}${sensors[4].id}`,
                      body: () => ({
                        ...sensors[4],
                        name: `${sensors[4].name} - replaced`,
                        resources: { ...step0Response.body },
                      }),
                      expect: (resp) => {
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
                  name: 'user CAN delete OWN resources',
                  verb: 'delete',
                  auth: profiles.user,
                  url: () => `${apiUrl}${sensors[1].id}/resources`,
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                  },
                },
                {
                  name: 'user CAN delete OWN measurements',
                  verb: 'delete',
                  auth: profiles.user,
                  url: () => `${apiUrl}${sensors[1].id}/measurements`,
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(204);
                  },
                },
                {
                  name: 'user CAN delete OWN',
                  verb: 'delete',
                  auth: profiles.user,
                  url: () => `${apiUrl}${sensors[1].id}`,
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body.count).to.be.equal(1);
                  },
                },
                {
                  name: 'admin CAN delete ALL',
                  verb: 'delete',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${sensors[0].id}`,
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body.count).to.be.equal(1);
                  },
                },
              ],
            },
            '[TEST] Verifying "Search" access': {
              tests: [
                {
                  name: 'everyone CANNOT search sensors',
                  verb: 'post',
                  url: () => `${apiUrl}search`,
                  body: () => ({
                    filter: { text: 0 },
                  }),
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(401);
                  },
                },
                {
                  name: 'user CANNOT search sensors with invalid input',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}search`,
                  body: () => ({
                    filter: { text: 0 },
                  }),
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(400);
                  },
                },
                {
                  name: 'user CAN search sensors by type',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}search`,
                  body: () => ({
                    filter: { text: sensors[2].type.toString() },
                  }),
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                  },
                },
                {
                  name: 'user CAN search sensors by type with limit',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}search`,
                  body: () => ({
                    filter: { text: sensors[2].type.toString(), limit: 2 },
                  }),
                  expect: (resp) => {
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
                  expect: (resp) => {
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
                    filter: { ownerId: sensors[2].ownerId, name: sensors[2].name },
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
                        ...sensors[2],
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
                      url: () => `${apiUrl}${sensors[2].id}/resources`,
                      expect: 200,
                    },
                    (step0Response) => ({
                      verb: 'post',
                      auth: profiles.admin,
                      url: () => `${apiUrl}on-publish`,
                      body: () => ({
                        device: { ...devices[1] },
                        sensor: {
                          ...sensors[2],
                          value: '10',
                          resource: 5700,
                          resources: { ...step0Response.body },
                        },
                        client: {
                          id: users[1].id,
                          user: users[1].id,
                        },
                      }),
                      expect: (resp) => {
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

    describe(`${collectionName} MQTT`, function () {
      const e2eTestsSuite = {
        [`[TEST] ${collectionName} E2E Tests`]: {
          tests: {
            '[TEST] Verifying "Temperature" sensor': {
              tests: [
                {
                  skip: false,
                  name: 'temperature sensor IS updated after publish',
                  options: () => clientFactory(devices[1], 'device', devices[1].apiKey),
                  url: () => app.get('mqtt url'),
                  verb: 'publish',
                  packet: () => ({
                    topic: packets[2].topic,
                    payload: packets[2].payload,
                  }),
                  timeout: 150,
                  expect: async (packet) => {
                    const index = 2;
                    const sensor = await utils.findById(SensorModel, sensors[index].id);
                    expect(sensor.value).to.be.equal(Number(packet.payload));
                    const measurements = await app.models.Measurement.find({
                      where: {
                        sensorId: sensors[index].id.toString(),
                        rp: { inq: ['0s', '1h', '2h'] },
                      },
                    });
                    const baseMeasurement = {
                      ownerId: sensors[index].ownerId.toString(),
                      deviceId: sensors[index].deviceId.toString(),
                      nativeNodeId: sensors[index].nativeNodeId,
                      nativeSensorId: sensors[index].nativeSensorId,
                      sensorId: sensors[index].id.toString(),
                      type: sensors[index].type.toString(),
                      // resource: sensors[index].resource.toString(),
                    };
                    expect(measurements).to.deep.match([
                      {
                        ...baseMeasurement,
                        resource: '5700',
                        value: 10,
                      },
                      {
                        ...baseMeasurement,
                        resource: '5700',
                        value: 35,
                      },
                    ]);

                    const resources = await SensorResourceModel.find(
                      sensors[index].deviceId,
                      sensors[index].id,
                    );
                    expect(resources[sensor.resource]).to.be.equal(Number(packet.payload));
                  },
                  error: (err) => {
                    console.log(`temperature sensor test:err : ${err}`);
                    throw err;
                  },
                },
              ],
            },
            '[TEST] Verifying "Timer" sensor': {
              tests: [
                {
                  skip: false,
                  name: 'timer sensor IS updated after publish',
                  options: () => clientFactory(devices[1], 'device', devices[1].apiKey),
                  url: () => app.get('mqtt url'),
                  verb: 'publish',
                  packet: () => ({
                    topic: packets[4].topic,
                    payload: packets[4].payload,
                  }),
                  timeout: 150,
                  expect: async () => {
                    const index = 4;
                    const sensor = await utils.findById(SensorModel, sensors[index].id);
                    expect(sensor.value).to.be.equal(Number(packets[index].payload));
                    const resources = await SensorResourceModel.find(
                      sensors[index].deviceId,
                      sensors[index].id,
                    );
                    expect(resources[sensor.resource]).to.be.equal(Number(packets[index].payload));
                  },
                  error: (err) => {
                    console.log(`timer sensor test:err : ${err}`);
                    throw err;
                  },
                },
                {
                  skip: false,
                  name: 'timer sensor CAN create scheduler instance after publish',
                  options: () => clientFactory(devices[1], 'device', devices[1].apiKey),
                  url: () => app.get('mqtt url'),
                  verb: 'publish',
                  packet: () => ({
                    topic: `${devices[1].devEui}-out/1/3340/0/1/5850`,
                    payload: '1',
                  }),
                  timeout: 100,
                  expect: async () => {
                    const index = 4;
                    const sensor = await utils.findById(SensorModel, sensors[index].id);
                    expect(sensor.value).to.be.equal(true);
                    const resources = await SensorResourceModel.find(
                      sensors[index].deviceId,
                      sensors[index].id,
                    );

                    expect(resources[sensor.resource]).to.be.equal(true);
                    const scheduler = JSON.parse(await SchedulerModel.get(`sensor-${sensor.id}`));
                    expect(scheduler.sensorId).to.be.equal(sensor.id);
                  },
                  error: (err) => {
                    console.log(`timer sensor test:err : ${err}`);
                    throw err;
                  },
                },
                {
                  skip: false,
                  name: 'timer sensor CAN delete scheduler instance after publish',
                  options: () => clientFactory(devices[1], 'device', devices[1].apiKey),
                  url: () => app.get('mqtt url'),
                  verb: 'publish',
                  packet: () => ({
                    topic: `${devices[1].devEui}-out/1/3340/0/1/5850`,
                    payload: '0',
                  }),
                  timeout: 150,
                  expect: async () => {
                    const index = 4;
                    const sensor = await utils.findById(SensorModel, sensors[index].id);
                    expect(sensor.value).to.be.equal(false);
                    const resources = await SensorResourceModel.find(
                      sensors[index].deviceId,
                      sensors[index].id,
                    );
                    expect(resources[sensor.resource]).to.be.equal(false);
                    const scheduler = JSON.parse(await SchedulerModel.get(`sensor-${sensor.id}`));
                    expect(scheduler).to.be.equal(null);
                  },
                  error: (err) => {
                    console.log(`timer sensor test:err : ${err}`);
                    throw err;
                  },
                },
              ],
            },
            '[TEST] Verifying "Text" sensor': {
              tests: [
                {
                  skip: false,
                  name: 'text sensor IS updated after publish',
                  options: () => clientFactory(devices[1], 'device', devices[1].apiKey),
                  url: () => app.get('mqtt url'),
                  verb: 'publish',
                  packet: () => ({
                    topic: packets[5].topic,
                    payload: packets[5].payload,
                  }),
                  timeout: 150,
                  expect: async (packet) => {
                    const index = 5;
                    const sensor = await utils.findById(SensorModel, sensors[index].id);
                    expect(sensor.value).to.be.equal(packet.payload);
                    const resources = await SensorResourceModel.find(
                      sensors[index].deviceId,
                      sensors[index].id,
                    );
                    expect(resources[sensor.resource]).to.be.equal(packet.payload);
                  },
                  error: (err) => {
                    console.log(`text sensor test:err : ${err}`);
                    throw err;
                  },
                },
              ],
            },
            '[TEST] Verifying "Switch" sensor': {
              tests: [
                {
                  skip: false,
                  name: 'switch sensor IS updated after publish',
                  options: () => clientFactory(devices[1], 'device', devices[1].apiKey),
                  url: () => app.get('mqtt url'),
                  verb: 'publish',
                  packet: () => ({
                    topic: packets[6].topic,
                    payload: packets[6].payload,
                  }),
                  timeout: 150,
                  expect: async (packet) => {
                    const index = 6;
                    const sensor = await utils.findById(SensorModel, sensors[index].id);
                    expect(sensor.value.toString()).to.be.equal(packet.payload);
                    const resources = await SensorResourceModel.find(
                      sensors[index].deviceId,
                      sensors[index].id,
                    );

                    expect(resources[sensor.resource].toString()).to.be.equal(packet.payload);
                  },
                  error: (err) => {
                    console.log(`switch sensor test:err : ${err}`);
                    throw err;
                  },
                },
              ],
            },
            '[TEST] Verifying "Bitmap" sensor': {
              tests: [
                {
                  skip: false,
                  name: 'bitmap sensor IS created after publish',
                  options: () => clientFactory(devices[1], 'device', devices[1].apiKey),
                  url: () => app.get('mqtt url'),
                  verb: 'publish',
                  packet: () => ({
                    topic: packets[7].topic,
                    payload: packets[7].payload,
                  }),
                  timeout: 150,
                  expect: async () => {
                    const index = 7;
                    const sensor = await utils.findById(SensorModel, sensors[index].id);
                    // expect(sensor.value.toString()).to.be.equal(packets[index].payload);
                    expect(sensor.type).to.be.equal(3349);
                    const resources = await SensorResourceModel.find(
                      sensors[index].deviceId,
                      sensors[index].id,
                    );
                    expect(Object.keys(resources)).to.deep.equal(['5750', '5910', '5911', '5912']);
                  },
                  error: (err) => {
                    console.log(`bitmap sensor test:err : ${err}`);
                    throw err;
                  },
                },
                {
                  skip: false,
                  name: 'bitmap sensor IS created after publish',
                  options: () => clientFactory(devices[1], 'device', devices[1].apiKey),
                  url: () => app.get('mqtt url'),
                  verb: 'publish',
                  packet: async () => ({
                    topic: `${devices[1].devEui}-out/1/3349/0/1/5910`,
                    payload: await utils.readFile(`${__dirname}/../../favicon.ico`, null),
                  }),
                  timeout: 150,
                  expect: async (packet) => {
                    const index = 7;
                    const sensor = await utils.findById(SensorModel, sensors[index].id);
                    const resources = await SensorResourceModel.find(
                      sensors[index].deviceId,
                      sensors[index].id,
                    );
                    expect(Buffer.byteLength(Buffer.from(resources[sensor.resource]))).to.be.equal(
                      Buffer.byteLength(packet.payload),
                    );
                  },
                  error: (err) => {
                    console.log(`bitmap sensor test:err : ${err}`);
                    throw err;
                  },
                },
              ],
            },
          },
        },
      };

      mqttTest({}, e2eTestsSuite);
    });
  });
};

setTimeout(() => {
  sensorTest();
  run();
}, delayBeforeTesting * 1.5);
