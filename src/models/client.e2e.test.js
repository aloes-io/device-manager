/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable security/detect-non-literal-regexp */
/* eslint-disable security/detect-object-injection */

import chai, { expect } from 'chai';
import chaiDeepMatch from 'chai-deep-match';
import lbe2e from 'lb-declarative-e2e-test';
import mqtt from 'async-mqtt';
import app from '../index';
import testHelper from '../services/test-helper';

require('../services/broker');

chai.use(chaiDeepMatch);

const delayBeforeTesting = 7000;
const restApiPath = `${process.env.REST_API_ROOT}`;
// const restApiPath = `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;

const clientTest = () => {
  const clientFactory = testHelper.factories.client;
  const deviceFactory = testHelper.factories.device;
  const loginUrl = `${restApiPath}/Users/login`;
  const collectionName = 'Clients';
  const apiUrl = `${restApiPath}/${collectionName}/`;

  describe(collectionName, function() {
    this.timeout(5000);
    this.slow(1000);
    const DeviceModel = app.models.Device;
    let devices, users, deviceClientsConf, deviceClients, deviceClientStore;

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
            await app.models.Client.deleteAll();

            users = await Promise.all([
              testHelper.access.admin.create(app),
              testHelper.access.user.create(app),
            ]);
            const userIds = [users[0].id, users[1].id];

            const deviceModels = Array(5)
              .fill('')
              .map((_, index) =>
                index <= 2
                  ? deviceFactory(index + 1, userIds[0])
                  : deviceFactory(index + 1, userIds[1]),
              );
            const res = await DeviceModel.create(deviceModels);
            devices = res.map(model => model.toJSON());

            deviceClientsConf = devices.map(device =>
              clientFactory(device, 'device', device.apiKey),
            );

            deviceClients = await Promise.all(
              deviceClientsConf.map(async conf => mqtt.connectAsync(app.get('mqtt url'), conf)),
            );

            deviceClientStore = deviceClientsConf
              .map((e, index) => ({
                id: e.clientId,
                model: 'Device',
                status: true,
                type: 'MQTT',
                user: devices[index].id.toString(),
                devEui: devices[index].devEui,
              }))
              .sort((a, b) => {
                if (a.devEui < b.devEui) return -1;
                if (a.devEui > b.devEui) return 1;
                return 0;
              });

            //  console.log({ deviceClientStore });
            return deviceClients;
          } catch (error) {
            console.log(`[TEST] ${collectionName} before:err`, error);
            return null;
          }
        },
        async after() {
          this.timeout(3000);
          await app.models.user.destroyAll();
          return Promise.all(deviceClients.map(async client => client.end(true)));
        },
        tests: {
          '[TEST] Verifying "Read" access': {
            tests: [
              {
                name: 'everyone CANNOT read ALL',
                verb: 'post',
                url: () => `${apiUrl}/find`,
                expect: 401,
              },
              {
                name: 'user CANNOT read ALL',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}/find`,
                expect: 401,
              },
              {
                name: 'admin CAN read with filter',
                verb: 'post',
                auth: profiles.admin,
                url: () => `${apiUrl}/find`,
                body: () => ({ filter: { match: deviceClientsConf[0].clientId } }),
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body).to.deep.match([
                    {
                      // ip: '::ffff:127.0.0.1',
                      id: deviceClientsConf[0].clientId,
                      model: 'Device',
                      status: true,
                      type: 'MQTT',
                      user: devices[0].id.toString(),
                      devEui: devices[0].devEui,
                    },
                  ]);
                },
              },
              {
                name: 'admin CAN read ALL',
                verb: 'post',
                auth: profiles.admin,
                url: () => `${apiUrl}/find`,
                expect: resp => {
                  const result = resp.body.sort((a, b) => {
                    if (a.devEui < b.devEui) return -1;
                    if (a.devEui > b.devEui) return 1;
                    return 0;
                  });
                  expect(resp.status).to.be.equal(200);
                  expect(result).to.deep.match(deviceClientStore);
                },
              },
            ],
          },
          '[TEST] Verifying "Delete" access': {
            tests: [
              {
                name: 'everyone CANNOT delete ALL',
                verb: 'post',
                url: () => `${apiUrl}/remove`,
                expect: 401,
              },
              {
                name: 'user CANNOT delete ALL',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}/remove`,
                expect: 401,
              },
              {
                name: 'admin CAN DELETE with filter',
                verb: 'post',
                auth: profiles.admin,
                url: () => `${apiUrl}/remove`,
                body: () => ({ filter: { match: deviceClientsConf[0].clientId } }),
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body).to.deep.equal([deviceClientsConf[0].clientId]);
                },
              },
              {
                name: 'admin CAN delete ALL',
                verb: 'post',
                auth: profiles.admin,
                url: () => `${apiUrl}/remove`,
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.sort()).to.deep.equal(
                    deviceClientsConf
                      .map(conf => conf.clientId)
                      .filter(clientId => clientId !== deviceClientsConf[0].clientId)
                      .sort(),
                  );
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
  clientTest();
  run();
}, delayBeforeTesting * 1.5);
