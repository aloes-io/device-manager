/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
import { expect } from 'chai';
import lbe2e from 'lb-declarative-e2e-test';
import mqtt from 'mqtt';
import app from '../index';
import testHelper, { clientEvent, timeout } from '../lib/test-helper';

require('../services/broker');

const delayBeforeTesting = 7000;
const restApiPath = `${process.env.REST_API_ROOT}`;
// const restApiPath = `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;

// todo test MQTT connection as lorawan application
// with sensor/device/application model update (create device attached to the app and sensors)
// test find with filter
const applicationTest = () => {
  const applicationFactory = testHelper.factories.application;
  const clientFactory = testHelper.factories.client;
  const loginUrl = `${restApiPath}/Users/login`;
  const collectionName = 'Applications';
  const apiUrl = `${restApiPath}/${collectionName}/`;
  const ApplicationModel = app.models.Application;
  let applications, users, userIds, packets;

  async function beforeTests() {
    try {
      // this.timeout(delayBeforeTesting);
      users = await Promise.all([
        testHelper.access.admin.create(app),
        testHelper.access.user.create(app),
      ]);
      userIds = [users[0].id, users[1].id];
      const models = Array(5)
        .fill('')
        .map((_, index) =>
          index <= 1
            ? applicationFactory(index + 1, userIds[0])
            : applicationFactory(index + 1, userIds[1]),
        );
      // console.log('CREATED applications MODELS ', models);
      const res = await ApplicationModel.create(models);
      applications = res.map(model => model.toJSON());

      const userPacket = {
        topic: `${users[1].id}/Application/PUT/${applications[1].id}`,
        payload: {
          ...applications[1],
          name: `${applications[1].name}-updated`,
        },
      };
      const applicationPacket = {
        topic: `${applications[1].id}/Application/PUT`,
        payload: JSON.stringify({ ...applications[1], name: 'new app name' }),
      };
      packets = [userPacket, applicationPacket];

      return applications;
    } catch (error) {
      console.log(`[TEST] ${collectionName} before:err`, error);
      return null;
    }
  }

  async function afterTests() {
    return Promise.all([ApplicationModel.destroyAll(), app.models.user.destroyAll()]);
  }
  describe(`${collectionName}`, () => {
    before(async () => {
      return beforeTests();
    });

    after(async () => {
      return afterTests();
    });

    describe(`${collectionName} HTTP`, function() {
      this.timeout(5000);
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
                  body: applicationFactory(6),
                  expect: 401,
                },
                {
                  name: 'user CAN create',
                  verb: 'post',
                  auth: profiles.user,
                  url: apiUrl,
                  body: applicationFactory(7),
                  expect: 200,
                },
                {
                  name: 'admin CAN create',
                  verb: 'post',
                  auth: profiles.admin,
                  url: apiUrl,
                  body: applicationFactory(8),
                  expect: 200,
                },
              ],
            },
            '[TEST] Verifying "Read" access': {
              tests: [
                {
                  name: 'everyone CANNOT read ONE',
                  verb: 'get',
                  url: () => `${apiUrl}${applications[0].id}`,
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
                  url: () => `${apiUrl}${applications[2].id}`,
                  expect: 200,
                },
                {
                  name: 'everyone CAN read OWN with collaborators',
                  verb: 'get',
                  auth: profiles.user,
                  url: () => `${apiUrl}${applications[2].id}?filter[include]=collaborators`,
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
                  url: () => apiUrl + applications[0].id,
                  body: () => ({ name: `${applications[0].name} - updated` }),
                  expect: 401,
                },
                {
                  name: 'user CANNOT update ALL',
                  verb: 'patch',
                  auth: profiles.user,
                  url: () => `${apiUrl}${applications[0].id}`,
                  body: () => ({ name: `${applications[0].name} - updated` }),
                  expect: 401,
                },
                {
                  name: 'user CAN update OWN',
                  verb: 'patch',
                  auth: profiles.user,
                  url: () => `${apiUrl}${applications[2].id}`,
                  body: () => ({ name: `${applications[2].name} - updated` }),
                  expect: 200,
                },
                {
                  name: 'admin CAN update ALL',
                  verb: 'patch',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${applications[2].id}`,
                  body: () => ({ name: `${applications[2].name} - updated` }),
                  expect: 200,
                },
              ],
            },
            '[TEST] Verifying "Replace" access': {
              tests: [
                {
                  name: 'everyone CANNOT replace',
                  verb: 'put',
                  url: () => apiUrl + applications[0].id,
                  body: () => ({
                    ...applications[0],
                    name: `${applications[0].name} - replaced`,
                  }),
                  expect: 401,
                },
                {
                  name: 'user CANNOT replace ALL',
                  verb: 'put',
                  auth: profiles.user,
                  url: () => `${apiUrl}${applications[0].id}`,
                  body: () => ({
                    ...applications[0],
                    name: `${applications[0].name} - replaced`,
                  }),
                  expect: 401,
                },
                {
                  name: 'user CAN replace OWN',
                  verb: 'put',
                  auth: profiles.user,
                  url: () => `${apiUrl}${applications[2].id}`,
                  body: () => ({
                    ...applications[2],
                    name: `${applications[2].name} - replaced`,
                  }),
                  expect: 200,
                },
                {
                  name: 'admin CAN replace ALL',
                  verb: 'put',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${applications[2].id}`,
                  body: () => ({
                    ...applications[2],
                    name: `${applications[2].name} - replaced`,
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
                  url: () => `${apiUrl}${applications[0].id}`,
                  expect: 401,
                },
                {
                  name: 'user CAN delete OWN',
                  verb: 'delete',
                  auth: profiles.user,
                  url: () => `${apiUrl}${applications[2].id}`,
                  expect: 200,
                },
                {
                  name: 'admin CAN delete ALL',
                  verb: 'delete',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${applications[3].id}`,
                  expect: 200,
                },
              ],
            },
            '[TEST] Verifying "Publish" access': {
              tests: [
                {
                  name: "user CAN update its application's status",
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}update-status`,
                  body: () => ({
                    client: {
                      appId: applications[0].id,
                      appEui: applications[0].appEui,
                      id: applications[0].appEui,
                      user: applications[0].id,
                    },
                    status: true,
                  }),
                  expect: 200,
                },
                {
                  name: 'application CAN update its status',
                  steps: [
                    {
                      verb: 'post',
                      url: () => `${apiUrl}authenticate`,
                      body: () => ({
                        appId: applications[0].id.toString(),
                        apiKey: applications[0].apiKey,
                      }),
                      expect: 200,
                    },
                    () => ({
                      verb: 'post',
                      headers: {
                        'accept-encoding': 'gzip, deflate',
                        'user-agent': 'node-superagent/3.8.3',
                        appid: applications[0].id,
                        appeui: applications[0].appEui,
                        apikey: applications[0].apiKey,
                      },
                      url: () => `${apiUrl}update-status`,
                      body: () => ({
                        client: {
                          appId: applications[0].id,
                          appEui: applications[0].appEui,
                          id: applications[0].appEui,
                          user: applications[0].id,
                        },
                        status: true,
                      }),
                      expect: 200,
                    }),
                  ],
                },
                {
                  name: 'application CAN read its state',
                  steps: [
                    {
                      verb: 'post',
                      url: () => `${apiUrl}authenticate`,
                      body: () => ({
                        appId: applications[0].id.toString(),
                        apiKey: applications[0].apiKey,
                      }),
                      expect: 200,
                    },
                    () => ({
                      verb: 'get',
                      headers: {
                        'accept-encoding': 'gzip, deflate',
                        'user-agent': 'node-superagent/3.8.3',
                        appid: applications[0].id,
                        appeui: applications[0].appEui,
                        apikey: applications[0].apiKey,
                      },
                      url: () => `${apiUrl}get-state/${applications[0].id}`,
                      expect: 200,
                    }),
                  ],
                },
                // {
                //   name: 'application CAN read its full state (with sensors and device)',
                //   steps: [
                //     {
                //       verb: 'post',
                //       url: () => `${apiUrl}authenticate`,
                //       body: () => ({
                //         appId: applications[0].id.toString(),
                //         apiKey: applications[0].apiKey,
                //       }),
                //       expect: 200,
                //     },
                //     () => ({
                //       verb: 'get',
                //       headers: {
                //         'accept-encoding': 'gzip, deflate',
                //         'user-agent': 'node-superagent/3.8.3',
                //         appid: applications[0].id,
                //         appeui: applications[0].appEui,
                //         apikey: applications[0].apiKey,
                //       },
                //       url: () => `${apiUrl}get-full-state/${applications[0].id}`,
                //       expect: 200,
                //     }),
                //   ],
                // },
              ],
            },
            '[TEST] Verifying "Authentification" access': {
              tests: [
                {
                  name: 'everyone CAN authenticate',
                  verb: 'post',
                  url: () => `${apiUrl}authenticate`,
                  body: () => ({
                    appId: applications[0].id.toString(),
                    apiKey: applications[0].apiKey,
                  }),
                  expect: 200,
                },
                {
                  name: 'everyone CANNOT refresh application API Key',
                  verb: 'post',
                  url: () => `${apiUrl}refresh-token/${applications[0].id}`,
                  expect: 401,
                },
                {
                  name: "user CANNOT refresh another OWNER applications's API Key",
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}refresh-token/${applications[0].id}`,
                  expect: 401,
                },
                {
                  name: 'user CAN refresh OWN application API Key',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}refresh-token/${applications[4].id}`,
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
        const testMaxDuration = 4000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);

        const client = mqtt.connect(app.get('mqtt url'));
        client.once('error', e => {
          expect(e.code).to.be.equal(4);
          done();
          client.end();
        });
        client.once('connect', () => {
          done(new Error('Should not connect'));
          client.end();
        });
        // setTimeout(() => done(new Error('Test timeout')), testMaxDuration - 100);
      });

      it('application CANNOT connect with wrong credentials', function(done) {
        const testMaxDuration = 4000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);
        const client = mqtt.connect(
          app.get('mqtt url'),
          clientFactory(applications[1], 'application', applications[0].apiKey),
        );
        client.once('error', e => {
          expect(e.code).to.be.equal(4);
          done();
          client.end();
        });
        client.once('connect', () => {
          done(new Error('Should not connect'));
          client.end();
        });
      });

      it('application CAN connect and its status is updated accordingly', async function() {
        const testMaxDuration = 4000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);
        const client = mqtt.connect(
          app.get('mqtt url'),
          clientFactory(applications[1], 'application', applications[1].apiKey),
        );

        const packet = await clientEvent(client, 'connect');
        expect(packet.returnCode).to.be.equal(0);
        await timeout(async () => {
          const application = await ApplicationModel.findById(applications[1].id);
          expect(application.status).to.be.equal(true);
          client.end();
        }, 150);

        return timeout(async () => {
          const application = await ApplicationModel.findById(applications[1].id);
          expect(application.status).to.be.equal(false);
        }, 150);
      });

      it('application CANNOT publish to ANY route', function(done) {
        const testMaxDuration = 5000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);
        const client = mqtt.connect(
          app.get('mqtt url'),
          clientFactory(applications[0], 'application', applications[0].apiKey),
        );

        client.once('error', e => {
          console.log('client error:', e);
        });

        client.once('offline', () => {
          client.end();
          done();
        });

        client.once('connect', () => {
          client.publish('FAKETOPIC', packets[1].payload, { qos: 1 });
          setTimeout(() => {
            if (client.connected) {
              client.end();
              done();
            }
          }, 1000);
        });

        // done(new Error('Should have ended with an error event'));
      });

      it('application CAN publish to OWN route', function(done) {
        const testMaxDuration = 5000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);
        const client = mqtt.connect(
          app.get('mqtt url'),
          clientFactory(applications[1], 'application', applications[1].apiKey),
        );
        client.once('error', e => {
          done(e);
        });
        client.once('offline', () => {
          client.end();
          done(new Error('Should not been offlined'));
        });

        client.once('connect', () => {
          client.publish(packets[1].topic, packets[1].payload, { qos: 1 });
          setTimeout(() => {
            if (client.connected) {
              client.end();
              done();
            }
          }, 1000);
        });
      });
    });
  });
};

setTimeout(() => {
  applicationTest();
  run();
}, delayBeforeTesting * 1.5);
