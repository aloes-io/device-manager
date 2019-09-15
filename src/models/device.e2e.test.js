/* eslint-disable import/no-extraneous-dependencies */
import lbe2e from 'lb-declarative-e2e-test';
import app from '../index';
import testHelper from '../services/test-helper';

require('@babel/register');
require('../services/broker');

const delayBeforeTesting = 7000;

const deviceTest = () => {
  const deviceFactory = testHelper.factories.device;
  const loginUrl = '/api/Users/login';
  const collectionName = 'Devices';

  return describe(collectionName, () => {
    const DeviceModel = app.models.Device;
    let devices;

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

    const apiUrl = `/api/${collectionName}/`;

    const e2eTestsSuite = {
      [`[TEST] ${collectionName} E2E Tests`]: {
        async before() {
          try {
            this.timeout(4000);
            const users = await Promise.all([
              testHelper.access.admin.create(app),
              testHelper.access.user.create(app),
            ]);
            const userIds = [users[0].id, users[1].id];
            const models = Array(5)
              .fill('')
              .map((_, index) => {
                if (index <= 1) {
                  return deviceFactory(index + 1, userIds[0]);
                }
                return deviceFactory(index + 1, userIds[1]);
              });
            // console.log('CREATED DEVICES MODELS ', models);
            const res = await DeviceModel.create(models);
            devices = res.map(model => model.toJSON());
            return devices;
          } catch (error) {
            console.log('[TEST] Devices before:err', error);
            return error;
          }
        },
        after: () =>
          Promise.all([
            DeviceModel.destroyAll(),
            app.models.user.destroyAll(),
            // process.kill(process.pid, 'SIGINT'),
          ]),
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
                url: () => apiUrl + devices[0].id,
                body: () => ({
                  ...devices[0],
                  name: `${devices[0].name} - updated`,
                }),
                expect: 401,
              },
              {
                name: 'user CANNOT update ALL',
                verb: 'put',
                auth: profiles.user,
                url: () => `${apiUrl}${devices[0].id}`,
                body: () => ({
                  ...devices[0],
                  name: `${devices[0].name} - updated`,
                }),
                expect: 401,
              },
              {
                name: 'user CAN update OWN',
                verb: 'put',
                auth: profiles.user,
                url: () => `${apiUrl}${devices[2].id}`,
                body: () => ({
                  ...devices[2],
                  name: `${devices[2].name} - updated`,
                }),
                expect: 200,
              },
              {
                name: 'admin CAN update ALL',
                verb: 'put',
                auth: profiles.admin,
                url: () => `${apiUrl}${devices[2].id}`,
                body: () => ({
                  ...devices[2],
                  name: `${devices[2].name} - updated`,
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
                url: () => `${apiUrl}${devices[0].id}`,
                expect: 401,
              },
              {
                name: 'user CAN delete OWN',
                verb: 'delete',
                auth: profiles.user,
                url: () => `${apiUrl}${devices[2].id}`,
                expect: 200,
              },
              {
                name: 'admin CAN delete ALL',
                verb: 'delete',
                auth: profiles.admin,
                url: () => `${apiUrl}${devices[3].id}`,
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
  deviceTest();
  run();
}, delayBeforeTesting);
