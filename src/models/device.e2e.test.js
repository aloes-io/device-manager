/* eslint-disable import/no-extraneous-dependencies */
import { expect } from 'chai';
import iotAgent from 'iot-agent';
import lbe2e from 'lb-declarative-e2e-test';
import app from '../index';
import testHelper from '../services/test-helper';

require('../services/broker');

const delayBeforeTesting = 7000;

const deviceTest = () => {
  const deviceFactory = testHelper.factories.device;
  const loginUrl = '/api/Users/login';
  const collectionName = 'Devices';
  const apiUrl = `/api/${collectionName}/`;

  describe(collectionName, function() {
    this.timeout(4000);
    const DeviceModel = app.models.Device;
    let devices, users, packets, patterns;

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
            // const packet = { topic: `${devices[0].devEui}-out/`, payload };
            const packet = {
              topic: `${users[1].id}/Device/PUT/${devices[1].id}`,
              payload: {
                ...devices[1],
                name: `${devices[1].name}-updated`,
              },
            };
            packets = [packet];
            patterns = packets.map(pac => iotAgent.patternDetector(pac));
            // console.log('FOUND PATTERNS ', patterns);
            return devices;
          } catch (error) {
            console.log(`[TEST] ${collectionName} before:err`, error);
            return error;
          }
        },
        after: () => Promise.all([DeviceModel.destroyAll(), app.models.user.destroyAll()]),
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
          '[TEST] Verifying "Location" access': {
            tests: [
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
                      apiKey: devices[0].apiKey,
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
                      apiKey: devices[0].apiKey,
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
                  apiKey: devices[0].apiKey,
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
};

setTimeout(() => {
  deviceTest();
  run();
}, delayBeforeTesting);
