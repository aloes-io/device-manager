/* eslint-disable import/no-extraneous-dependencies */
import { expect } from 'chai';
import lbe2e from 'lb-declarative-e2e-test';
import app from '../index';
import testHelper from '../services/test-helper';

require('../services/broker');

const delayBeforeTesting = 7000;
const restApiPath = `${process.env.REST_API_ROOT}`;
// const restApiPath = `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;

const addressTest = () => {
  const deviceFactory = testHelper.factories.device;
  const addressFactory = testHelper.factories.address;
  const loginUrl = `${restApiPath}/Users/login`;
  const collectionName = 'Addresses';
  const apiUrl = `${restApiPath}/${collectionName}/`;
  const deviceApiUrl = `${restApiPath}/Devices/`;
  const userApiUrl = `${restApiPath}/Users/`;

  describe(collectionName, function() {
    this.timeout(4000);
    const DeviceModel = app.models.Device;
    const AddressModel = app.models.Address;
    let devices, users, userAddress, deviceAddress;

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
            userAddress = await AddressModel.findOne({
              where: {
                and: [
                  { ownerId: users[1].id },
                  { ownerType: { like: new RegExp(`.*user.*`, 'i') } },
                ],
              },
            });

            // console.log('USER ADDRESS ', userAddress);

            const deviceModels = Array(2)
              .fill('')
              .map((_, index) => {
                if (index <= 0) {
                  return deviceFactory(index + 1, userIds[0]);
                }
                return deviceFactory(index + 1, userIds[1]);
              });
            // console.log('CREATED DEVICES MODELS ', models);
            const res = await DeviceModel.create(deviceModels);
            devices = res.map(model => model.toJSON());
            // deviceAddress = await AddressModel.find({ where: { ownerId: devices[0].id } });
            deviceAddress = await AddressModel.findOne({
              where: {
                and: [
                  { ownerId: devices[1].id },
                  { ownerType: { like: new RegExp(`.*device.*`, 'i') } },
                ],
              },
            });
            console.log('DEVICE ADDRESS ', deviceAddress);

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
                body: () => addressFactory(6, users[1]),
                expect: 401,
              },
              {
                name: 'user CANNOT create NEW address',
                verb: 'post',
                auth: profiles.user,
                url: () => `${userApiUrl}${users[1].id}/address`,
                body: () => addressFactory(7, users[1]),
                expect: 401,
              },
              {
                name: 'user CANNOT create NEW device address',
                verb: 'post',
                auth: profiles.user,
                url: () => `${deviceApiUrl}${devices[1].id}/address`,
                body: () => addressFactory(8, devices[1]),
                expect: 401,
              },
              {
                name: 'admin CANNOT create',
                verb: 'post',
                auth: profiles.admin,
                url: apiUrl,
                body: () => addressFactory(9, users[0]),
                expect: 401,
              },
            ],
          },
          '[TEST] Verifying "Read" access': {
            tests: [
              {
                name: 'everyone CANNOT read ONE',
                verb: 'get',
                url: () => `${userApiUrl}${users[1].id}/address`,
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
                url: () => `${userApiUrl}${users[1].id}/address`,
                expect: 200,
              },
              {
                name: 'user CAN read OWN device address',
                verb: 'get',
                auth: profiles.user,
                url: () => `${deviceApiUrl}${devices[1].id}/address`,
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
                url: () => `${userApiUrl}${users[1].id}/address`,
                body: () => ({
                  ...userAddress,
                  city: `${userAddress.city} - updated`,
                }),
                expect: 401,
              },
              {
                name: 'user CANNOT update ALL',
                verb: 'put',
                auth: profiles.user,
                url: () => `${userApiUrl}${users[0].id}/address`,
                body: () => ({
                  ...userAddress,
                  city: `${userAddress.city} - updated`,
                }),
                expect: 401,
              },
              {
                name: 'user CAN update OWN',
                verb: 'put',
                auth: profiles.user,
                url: () => `${userApiUrl}${users[1].id}/address`,
                body: () => ({
                  ...userAddress,
                  city: 'La Rochelle',
                  public: true,
                }),
                expect: 200,
              },
              {
                name: 'user CAN update OWN device address',
                verb: 'put',
                auth: profiles.user,
                url: () => `${deviceApiUrl}${devices[1].id}/address`,
                body: () => ({
                  ...deviceAddress,
                  city: 'Nantes',
                  public: true,
                }),
                expect: 200,
              },
              {
                name: 'admin CAN update ALL',
                verb: 'put',
                auth: profiles.admin,
                url: () => `${userApiUrl}${users[1].id}/address`,
                body: () => ({
                  ...userAddress,
                  city: 'Nantes',
                  public: true,
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
                url: () => `${apiUrl}`,
                expect: 404,
              },
              {
                name: 'user CANNOT delete',
                verb: 'delete',
                auth: profiles.user,
                url: () => `${userApiUrl}${users[0].id}/address`,
                expect: 401,
              },
              {
                name: 'user CANNOT delete OWN',
                verb: 'delete',
                auth: profiles.user,
                url: () => `${userApiUrl}${users[1].id}/address`,
                expect: 401,
              },
              {
                name: 'admin CANNOT delete ALL',
                verb: 'delete',
                auth: profiles.admin,
                url: () => `${userApiUrl}${users[1].id}/address`,
                expect: 401,
              },
            ],
          },
          '[TEST] "verifyAddress" access': {
            tests: [
              {
                name: 'everyone CANNOT verify address',
                verb: 'post',
                url: () => `${apiUrl}verify`,
                body: () => ({
                  address: addressFactory(10, users[0]),
                }),
                expect: 401,
              },
              {
                name: 'user CAN verify address',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}verify`,
                body: () => ({
                  address: addressFactory(11, users[0]),
                }),
                expect: 200,
              },
              {
                name: 'admin CAN verify address',
                verb: 'post',
                auth: profiles.admin,
                url: () => `${apiUrl}verify`,
                body: () => ({
                  address: addressFactory(12, users[1]),
                }),
                expect: 200,
              },
            ],
          },
          '[TEST] Verifying "Location" access': {
            tests: [
              {
                name: 'user CAN search; devices by address',
                steps: [
                  {
                    verb: 'post',
                    auth: profiles.user,
                    url: () => `${apiUrl}verify`,
                    body: {
                      address: {
                        city: 'Nantes',
                        postalCode: '44000',
                        street: '95 rue paul bellamy',
                        public: true,
                      },
                    },
                    expect: 200,
                  },
                  step0Response => ({
                    verb: 'put',
                    auth: profiles.user,
                    url: () => `${deviceApiUrl}${devices[1].id}/address`,
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
                      filter: { ownerType: 'Device', city: step1Response.body.city },
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
                    url: () => `${apiUrl}verify`,
                    body: {
                      address: {
                        city: 'Nantes',
                        postalCode: '44000',
                        street: '95 rue paul bellamy',
                        public: true,
                      },
                    },
                    expect: 200,
                  },
                  step0Response => ({
                    verb: 'put',
                    auth: profiles.admin,
                    url: () => `${deviceApiUrl}${devices[0].id}/address`,
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
                        ownerType: 'Device',
                        location: step1Response.body.coordinates,
                        maxDistance: 50,
                        unit: 'kilometers',
                      },
                    }),
                    expect: resp => {
                      expect(resp.status).to.be.equal(200);
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
};

setTimeout(() => {
  addressTest();
  run();
}, delayBeforeTesting);
