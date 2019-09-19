/* eslint-disable import/no-extraneous-dependencies */
import lbe2e from 'lb-declarative-e2e-test';
import app from '../index';
import testHelper from '../services/test-helper';

require('../services/broker');

const delayBeforeTesting = 7000;

const sensorTest = () => {
  const deviceFactory = testHelper.factories.device;
  const sensorFactory = testHelper.factories.sensor;
  const loginUrl = '/api/Users/login';
  const collectionName = 'Sensors';
  const apiUrl = `/api/${collectionName}/`;

  describe(collectionName, () => {
    const DeviceModel = app.models.Device;
    const SensorModel = app.models.Sensor;
    let users, devices, sensors, userIds;

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
        async before() {
          try {
            this.timeout(7000);
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
            await DeviceModel.create(deviceModels).then(res => {
              devices = res.map(model => model.toJSON());
              return res;
            });

            const sensorModels = Array(5)
              .fill('')
              .map((_, index) => {
                if (index <= 2) {
                  return sensorFactory(index + 1, devices[0], userIds[0]);
                }
                return sensorFactory(index + 1, devices[1], userIds[1]);
              });
            // console.log('CREATED SENSORS MODELS ', sensorModels);
            await SensorModel.create(sensorModels).then(res => {
              sensors = res.map(model => model.toJSON());
              return res;
            });
            return sensors;
          } catch (error) {
            console.log(`[TEST] ${collectionName} before:err`, error);
            return error;
          }
        },
        // beforeEach() {
        //   this.timeout(5000);
        // },
        after: () =>
          Promise.all([
            SensorModel.destroyAll(),
            DeviceModel.destroyAll(),
            app.models.user.destroyAll(),
          ]),
        tests: {
          '[TEST] Verifying "Create" access': {
            tests: [
              {
                name: 'everyone CANNOT create',
                verb: 'post',
                url: apiUrl,
                body: () => sensorFactory(6, devices[0]),
                expect: 401,
              },
              {
                name: 'user CAN create',
                verb: 'post',
                auth: profiles.user,
                url: apiUrl,
                body: () => sensorFactory(7, devices[1], userIds[1]),
                expect: 200,
              },
              {
                name: 'admin CAN create',
                verb: 'post',
                auth: profiles.admin,
                url: apiUrl,
                body: () => sensorFactory(8, devices[0], userIds[0]),
                expect: 200,
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
                name: 'everyone CAN read OWN',
                verb: 'get',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[4].id}`,
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
                verb: 'put',
                url: () => `${apiUrl}${sensors[0].id}`,
                body: () => ({
                  ...sensors[0],
                  name: `${sensors[0].name} - updated`,
                }),
                expect: 401,
              },
              {
                name: 'user CANNOT update ALL',
                verb: 'put',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[0].id}`,
                body: () => ({
                  ...sensors[0],
                  name: `${sensors[0].name} - updated`,
                }),
                expect: 401,
              },
              {
                name: 'user CAN update OWN',
                verb: 'put',
                auth: profiles.user,
                url: () => `${apiUrl}${sensors[3].id}`,
                body: () => ({
                  ...sensors[3],
                  name: `${sensors[3].name} - updated`,
                }),
                expect: 200,
              },
              {
                name: 'admin CAN update ALL',
                verb: 'put',
                auth: profiles.admin,
                url: () => `${apiUrl}${sensors[4].id}`,
                body: () => ({
                  ...sensors[4],
                  name: `${sensors[4].name} - updated`,
                }),
                expect: 200,
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
                expect: 200,
              },
              {
                name: 'admin CAN delete ALL',
                verb: 'delete',
                auth: profiles.admin,
                url: () => `${apiUrl}${sensors[4].id}`,
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
                  device: { ...devices[2] },
                  sensor: { ...sensors[0], value: 10, lastSignal: new Date() },
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
                  device: { ...devices[2] },
                  sensor: { ...sensors[0], value: 10, lastSignal: new Date() },
                  client: {
                    id: users[1].id,
                    user: users[1].id,
                  },
                }),
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
};

setTimeout(() => {
  sensorTest();
  run();
}, delayBeforeTesting);
