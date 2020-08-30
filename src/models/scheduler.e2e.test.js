/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
import { expect } from 'chai';
import lbe2e from 'lb-declarative-e2e-test';
import app from '../index';
import testHelper from '../lib/test-helper';

require('../services/broker');

const delayBeforeTesting = 7000;
const restApiPath = `${process.env.REST_API_ROOT}`;
// const restApiPath = `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;

// todo :
// test createOrUpdate mode === 1 || 2 || 3 (should trigger error)
const schedulerTest = () => {
  const { device: deviceFactory, sensor: sensorFactory } = testHelper.factories;
  const loginUrl = `${restApiPath}/Users/login`;
  const collectionName = 'Schedulers';
  const apiUrl = `${restApiPath}/${collectionName}/`;
  const { Device: DeviceModel, Sensor: SensorModel } = app.models;
  let users, devices, sensors, userIds;

  async function beforeTests() {
    try {
      users = await Promise.all([
        testHelper.access.admin.create(app),
        testHelper.access.user.create(app),
      ]);
      userIds = [users[0].id, users[1].id];

      const deviceModels = Array(2)
        .fill('')
        .map((_, index) => {
          if (index === 0) {
            return deviceFactory(index + 1, userIds[0]);
          }
          return deviceFactory(index + 1, userIds[1]);
        });
      await DeviceModel.create(deviceModels).then((res) => {
        devices = res.map((model) => model.toJSON());
        return res;
      });

      const sensorModels = Array(4)
        .fill('')
        .map((_, index) => {
          return index <= 2
            ? sensorFactory(index + 1, devices[0], userIds[0])
            : sensorFactory(index + 1, devices[1], userIds[1], 3340);
        });

      await SensorModel.create(sensorModels).then((res) => {
        sensors = res.map((model) => model.toJSON());
        return res;
      });

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
        before: beforeTests,
        after: afterTests,
        tests: {
          '[TEST] Verifying "CreateOrUpdate" access': {
            tests: [
              {
                name: 'everyone CANNOT start a new Scheduler via event property',
                verb: 'post',
                url: () => `${apiUrl}create-or-update`,
                body: () => ({
                  sensor: {
                    ...sensors[3],
                    resources: {
                      ...sensors[3].resources,
                      '5523': 'start',
                      '5526': 0,
                      '5521': 1500,
                    },
                    resource: 5523,
                    value: 'start',
                    lastSignal: new Date(),
                  },
                  client: {
                    id: users[1].id,
                    user: users[1].id,
                  },
                }),
                expect: 401,
              },
              {
                name: 'user CAN start a new Scheduler via event property',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}create-or-update`,
                body: () => ({
                  sensor: {
                    ...sensors[3],
                    resources: {
                      ...sensors[3].resources,
                      '5523': 'start',
                      '5526': 1,
                      '5521': 1500,
                    },
                    resource: 5523,
                    value: 'start',
                    lastSignal: new Date(),
                  },
                  client: {
                    id: users[1].id,
                    user: users[1].id,
                  },
                }),
                expect: (resp) => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.sensorId).to.be.equal(sensors[3].id);
                },
              },
              {
                name: 'user CAN pause an existing Scheduler via event property',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}create-or-update`,
                body: () => ({
                  sensor: {
                    ...sensors[3],
                    resources: {
                      ...sensors[3].resources,
                      '5521': 1500,
                      '5538': 1300,
                      '5523': 'pause',
                      '5526': 1,
                    },
                    resource: 5523,
                    value: 'pause',
                    lastSignal: new Date(),
                  },
                  client: {
                    id: users[1].id,
                    user: users[1].id,
                  },
                }),
                expect: (resp) => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.sensorId).to.be.equal(sensors[3].id);
                },
              },
              {
                name: 'user CAN restart an existing Scheduler via event property',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}create-or-update`,
                body: () => ({
                  sensor: {
                    ...sensors[3],
                    resources: {
                      ...sensors[3].resources,
                      '5521': 1500,
                      '5538': 1300,
                      '5523': 'restart',
                      '5526': 1,
                    },
                    resource: 5523,
                    value: 'restart',
                    lastSignal: new Date(),
                  },
                  client: {
                    id: users[1].id,
                    user: users[1].id,
                  },
                }),
                expect: (resp) => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.sensorId).to.be.equal(sensors[3].id);
                },
              },
              {
                name: 'user CAN stop an existing Scheduler via event property',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}create-or-update`,
                body: () => ({
                  sensor: {
                    ...sensors[3],
                    resources: {
                      ...sensors[3].resources,
                      '5521': 1500,
                      '5538': 1300,
                      '5523': 'stop',
                      '5526': 1,
                    },
                    resource: 5523,
                    value: 'stop',
                    lastSignal: new Date(),
                  },
                  client: {
                    id: users[1].id,
                    user: users[1].id,
                  },
                }),
                expect: (resp) => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.sensorId).to.be.equal(sensors[3].id);
                },
              },
              {
                name: 'user CAN start a new Scheduler via trigger property',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}create-or-update`,
                body: () => ({
                  sensor: {
                    ...sensors[3],
                    resources: {
                      ...sensors[3].resources,
                      '5850': true,
                      '5526': 0,
                      '5521': 1500,
                    },
                    resource: 5850,
                    value: true,
                    lastSignal: new Date(),
                  },
                  client: {
                    id: users[1].id,
                    user: users[1].id,
                  },
                }),
                expect: (resp) => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.sensorId).to.be.equal(sensors[3].id);
                },
              },
              {
                name: 'user CAN stop an existing Scheduler via trigger property',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}create-or-update`,
                body: () => ({
                  sensor: {
                    ...sensors[3],
                    resources: {
                      ...sensors[3].resources,
                      '5850': false,
                      '5526': 0,
                    },
                    resource: 5850,
                    value: false,
                    lastSignal: new Date(),
                  },
                  client: {
                    id: users[1].id,
                    user: users[1].id,
                  },
                }),
                expect: (resp) => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.sensorId).to.be.equal(sensors[3].id);
                },
              },
            ],
          },
          '[TEST] Verifying "Webhook" access': {
            tests: [
              {
                name: 'everyone CANNOT trigger on-timeout webhook',
                verb: 'post',
                url: () => `${apiUrl}on-timeout`,
                body: () => ({
                  // secret: null,
                  deviceId: devices[1].id,
                  sensorId: sensors[3].id,
                }),
                expect: 401,
              },
              {
                name: 'authenticated client CAN trigger on-timeout webhook',
                steps: [
                  {
                    verb: 'post',
                    auth: profiles.user,
                    url: () => `${apiUrl}create-or-update`,
                    body: () => ({
                      sensor: {
                        ...sensors[3],
                        resources: {
                          ...sensors[3].resources,
                          '5850': true,
                          '5526': 0,
                          '5521': 1500,
                        },
                        resource: 5850,
                        value: true,
                        lastSignal: new Date(),
                      },
                      client: {
                        id: users[1].id,
                        user: users[1].id,
                      },
                    }),
                    expect: 200,
                  },
                  () => ({
                    verb: 'post',
                    url: () => `${apiUrl}on-timeout`,
                    body: () => ({
                      secret: process.env.ALOES_KEY,
                      deviceId: devices[1].id,
                      sensorId: sensors[3].id,
                    }),
                    expect: (resp) => {
                      expect(resp.status).to.be.equal(200);
                      expect(resp.body).to.be.equal(true);
                    },
                  }),
                ],
              },
              {
                name: 'everyone CANNOT trigger on-tick webhook',
                verb: 'post',
                url: () => `${apiUrl}on-tick`,
                body: () => ({
                  // secret: null,
                  name: 'scheduler-clock',
                }),
                expect: 401,
              },
              {
                name: 'authenticated client CAN trigger on-tick webhook',
                verb: 'post',
                url: () => `${apiUrl}on-tick`,
                body: () => ({
                  secret: process.env.ALOES_KEY,
                  name: 'scheduler-clock',
                }),
                expect: (resp) => {
                  expect(resp.status).to.be.equal(200);
                  // expect(resp.body).to.be.equal(false);
                },
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
};

setTimeout(() => {
  schedulerTest();
  run();
}, delayBeforeTesting * 1.5);
