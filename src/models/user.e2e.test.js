/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
import { expect } from 'chai';
import lbe2e from 'lb-declarative-e2e-test';
import mqtt from 'mqtt';
import app from '../index';
import testHelper, { clientEvent, timeout } from '../lib/test-helper';
import broker from '../services/broker';
// import mails from '../services/mails';

const delayBeforeTesting = 7000;
const restApiPath = `${process.env.REST_API_ROOT}`;
// const restApiPath = `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;

// todo test MQTT connection as a user
// send contactForm, sendMailInvite, findByEmail
// test rate limiter with x failed login attempts
// test single user deletion
const userTest = () => {
  const { client: clientFactory, user: userFactory } = testHelper.factories;
  const loginUrl = `${restApiPath}/Users/login`;
  const collectionName = 'Users';
  const apiUrl = `${restApiPath}/${collectionName}/`;
  const { Client: ClientModel, user: UserModel } = app.models;
  let userModels, users;

  async function beforeTests() {
    try {
      userModels = Array(2)
        .fill('')
        .map(() => userFactory(undefined, 'user'));

      const result = await Promise.all([
        testHelper.access.admin.create(app),
        testHelper.access.user.create(app),
        UserModel.create(userModels),
      ]);

      users = result[2];
      users.push(result[1]);
      users.push(result[0]);

      return result;
    } catch (error) {
      console.log(`[TEST] ${collectionName} before:err`, error);
      return null;
    }
  }

  async function afterTests() {
    // return Promise.all([UserModel.destroyAll(), broker.stop()]).then(() => app.stop());
    return Promise.all([UserModel.destroyAll(), app.stop(), broker.stop()]).then(() =>
      process.exit(0),
    );
  }

  describe(`${collectionName}`, () => {
    before(async () => {
      return beforeTests();
    });

    after(async () => {
      return timeout(async () => afterTests(), 250);
      // return afterTests();
    });

    describe(`${collectionName} HTTP`, () => {
      // this.timeout(7000);

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
                  name: 'everyone CAN create "roleName: user" user',
                  verb: 'post',
                  url: apiUrl,
                  body: userFactory(undefined, 'user'),
                  expect: 200,
                },
                {
                  name: 'everyone CANNOT create "roleName: admin" user',
                  verb: 'post',
                  url: apiUrl,
                  body: userFactory(undefined, 'admin'),
                  expect: 403,
                },
                {
                  name: 'user CANNOT create "roleName: admin" user',
                  verb: 'post',
                  auth: profiles.user,
                  url: apiUrl,
                  body: userFactory(undefined, 'admin'),
                  expect: 403,
                },
                {
                  name: 'admin CAN create "roleName: user" user',
                  verb: 'post',
                  auth: profiles.admin,
                  url: apiUrl,
                  body: userFactory(undefined, 'user'),
                  expect: 200,
                },
                {
                  name: 'admin CAN create "roleName: admin" user',
                  verb: 'post',
                  auth: profiles.admin,
                  url: apiUrl,
                  body: userFactory(undefined, 'admin'),
                  expect: 200,
                },
              ],
            },
            '[TEST] Verifying "Read" access': {
              tests: [
                {
                  name: 'everyone CANNOT read user details',
                  verb: 'get',
                  url: () => `${apiUrl}${users[0].id}`,
                  expect: 401,
                },
                {
                  name: 'everyone CANNOT read user list',
                  verb: 'get',
                  url: apiUrl,
                  expect: 401,
                },
                {
                  name: 'user CANNOT read user details',
                  verb: 'get',
                  auth: profiles.user, // user 0
                  url: () => `${apiUrl}${users[1].id}`,
                  expect: 401,
                },
                {
                  name: 'user CANNOT read user list',
                  verb: 'get',
                  auth: profiles.user,
                  url: apiUrl,
                  expect: 401,
                },
                {
                  name: 'user CAN read his OWN details',
                  verb: 'get',
                  auth: profiles.user,
                  url: () => `${apiUrl}${users[2].id}`,
                  expect: 200,
                },
                {
                  name: "user's password is NOT sent to client",
                  verb: 'get',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${users[2].id}`,
                  expect: (res) => expect(res.body.password).to.be.undefined,
                },
                {
                  name: 'admin CAN read user details',
                  verb: 'get',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${users[0].id}`,
                  expect: 200,
                },
                {
                  name: 'admin CAN read user list',
                  verb: 'get',
                  auth: profiles.admin,
                  url: apiUrl,
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                    // expect(resp.body[0].id).to.be.equal(users[0].id);
                  },
                },
              ],
            },
            '[TEST] Verifying "Update" access': {
              tests: [
                {
                  name: "everyone CANNOT update user's details",
                  verb: 'patch',
                  url: () => `${apiUrl}${users[0].id}`,
                  body: { firstName: 'test' },
                  expect: 401,
                },
                {
                  name: "user CANNOT update another user's details",
                  verb: 'patch',
                  auth: profiles.user, // user 0
                  url: () => `${apiUrl}${users[1].id}`,
                  body: { firstName: 'test' },
                  expect: 401,
                },
                {
                  name: 'user CAN update his OWN details',
                  verb: 'patch',
                  auth: profiles.user,
                  url: () => `${apiUrl}${users[2].id}`,
                  body: { firstName: 'test' },
                  expect: 200,
                },
                {
                  name: 'user CANNOT update his OWN details to "roleName: admin"',
                  verb: 'patch',
                  auth: profiles.user,
                  url: () => `${apiUrl}${users[2].id}`,
                  body: { roleName: 'admin' },
                  expect: 403,
                },

                {
                  name: "admin CAN update user's details",
                  verb: 'patch',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${users[0].id}`,
                  body: { firstName: 'test' },
                  expect: 200,
                },
                {
                  name: "admin CANNOT update user's password",
                  verb: 'patch',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${users[0].id}`,
                  body: { password: 'someEasyOnes' },
                  expect: 403,
                },
                {
                  name: 'admin CAN update user\'s details to "roleName: admin"',
                  verb: 'patch',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${users[0].id}`,
                  body: { roleName: 'admin' },
                  expect: 200,
                },
              ],
            },
            '[TEST] Verifying "Replace" access': {
              tests: [
                {
                  name: "everyone CANNOT replace user's details",
                  verb: 'put',
                  url: () => `${apiUrl}${users[0].id}`,
                  body: () => ({ ...users[0], firstName: 'test' }),
                  expect: 401,
                },
                {
                  name: "user CANNOT replace another user's details",
                  verb: 'put',
                  auth: profiles.user, // user 3
                  url: () => `${apiUrl}${users[1].id}`,
                  body: () => ({ ...users[1], firstName: 'test' }),
                  expect: 401,
                },
                {
                  name: 'user CAN replace his OWN details',
                  verb: 'put',
                  auth: profiles.user,
                  url: () => `${apiUrl}${users[2].id}`,
                  body: () => ({ ...users[2], firstName: 'test' }),
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body.firstName).to.be.equal('test');
                  },
                },
                {
                  name: "admin CAN replace user's details",
                  verb: 'put',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${users[0].id}`,
                  body: () => ({ ...users[0], firstName: 'test' }),
                  expect: (resp) => {
                    expect(resp.status).to.be.equal(200);
                    expect(resp.body.firstName).to.be.equal('test');
                  },
                },
                {
                  name: 'admin CAN replace user\'s details with "roleName: user"',
                  verb: 'put',
                  auth: profiles.admin,
                  url: () => `${apiUrl}${users[0].id}`,
                  body: () => ({ ...users[0], roleName: 'user' }),
                  expect: 200,
                },
              ],
            },
            '[TEST] Verifying "Login" access': {
              tests: [
                {
                  name: 'everyone CAN login and logout',
                  steps: [
                    {
                      verb: 'post',
                      url: () => `${loginUrl}`,
                      body: profiles.admin,
                      expect: 200,
                    },
                    (step0Response) => ({
                      url: () => `${apiUrl}logout?access_token=${step0Response.body.id}`,
                      verb: 'post',
                      expect: 204,
                    }),
                  ],
                },
              ],
            },
            '[TEST] Verifying "Contact" utils': {
              tests: [
                {
                  name: 'everyone CANNOT send an invitation to a new user',
                  verb: 'post',
                  url: () => `${apiUrl}send-invite`,
                  body: () => ({
                    options: {
                      profile: {
                        firstName: 'Ricardo',
                        lastName: 'DeLaVega',
                      },
                      email: 'ed@getlarge.eu',
                    },
                  }),
                  expect: 401,
                },
                {
                  name: 'user CANNOT send an empty invitation to a new user',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}send-invite`,
                  body: () => ({
                    options: {},
                  }),
                  expect: 400,
                },
                {
                  name: 'user CANNOT send an invitation to a new user with malformated email',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}send-invite`,
                  body: () => ({
                    options: {
                      profile: {
                        firstName: 'Ricardo',
                        lastName: 'DeLaVega',
                      },
                      email: 'badtest',
                    },
                  }),
                  expect: 400,
                },
                {
                  name: 'user CAN send an invitation to a new user',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}send-invite`,
                  body: () => ({
                    options: {
                      profile: {
                        firstName: 'Ricardo',
                        lastName: 'DeLaVega',
                      },
                      email: 'ed@getlarge.eu',
                    },
                  }),
                  expect: 200,
                },
                {
                  name: 'everyone CANNOT send a contact form to admin with malformated email',
                  verb: 'post',
                  url: () => `${apiUrl}send-contact-form`,
                  body: () => ({
                    form: {
                      subject: 'Bug report',
                      content: 'Bonjour Aloes a encore des bugs',
                      email: 'badtest',
                    },
                  }),
                  expect: 400,
                },
                {
                  name: 'everyone CANNOT send an empty contact form to admin',
                  verb: 'post',
                  url: () => `${apiUrl}send-contact-form`,
                  body: () => ({}),
                  expect: 400,
                },
                {
                  name: 'everyone CAN send a contact form to admin',
                  verb: 'post',
                  url: () => `${apiUrl}send-contact-form`,
                  body: () => ({
                    form: {
                      firstName: 'Ricardo',
                      lastName: 'DeLaVega',
                      subject: 'Bug report',
                      content: 'Bonjour Aloes a encore des bugs',
                      email: 'ed@getlarge.eu',
                    },
                  }),
                  expect: 200,
                },
              ],
            },
            '[TEST] Verifying "Authentification" utils': {
              tests: [
                {
                  name:
                    'everyone CANNOT check if an account exists by email with malformated email',
                  verb: 'post',
                  url: () => `${apiUrl}find-by-email`,
                  body: () => ({
                    email: 'badtest',
                  }),
                  expect: 400,
                },
                {
                  name: 'everyone CANNOT check if an account exists by email with invalid email',
                  verb: 'post',
                  url: () => `${apiUrl}find-by-email`,
                  body: () => ({
                    email: 'test@test.com',
                  }),
                  expect: 404,
                },
                {
                  name: 'everyone CAN check if its account exists by email',
                  verb: 'post',
                  url: () => `${apiUrl}find-by-email`,
                  body: () => ({
                    email: profiles.user.email,
                  }),
                  expect: 200,
                },
                {
                  name: 'everyone CANNOT validate account creation if parameter is invalid',
                  verb: 'post',
                  url: () => `${apiUrl}verify-email`,
                  body: () => ({
                    user: { name: 'Maurice' },
                  }),
                  expect: 400,
                },
                {
                  name: 'everyone CANNOT validate account creation if user is invalid',
                  verb: 'post',
                  url: () => `${apiUrl}verify-email`,
                  body: () => ({
                    user: { ...users[1], id: 115 },
                  }),
                  expect: 404,
                },
                {
                  name: 'everyone CAN validate account creation',
                  verb: 'post',
                  url: () => `${apiUrl}verify-email`,
                  body: () => ({
                    user: users[1],
                  }),
                  expect: 200,
                },
                {
                  name: 'everyone CAN request new password by email',
                  verb: 'post',
                  url: () => `${apiUrl}reset`,
                  body: () => ({
                    email: profiles.user.email,
                  }),
                  expect: 204,
                },
                {
                  name: 'everyone CANNOT replace user old password with new',
                  verb: 'post',
                  url: () => `${apiUrl}set-new-password`,
                  body: () => ({
                    oldPassword: profiles.user.password,
                    newPassword: 'TRICKYPASSWORD',
                  }),
                  expect: 401,
                },
                {
                  name: 'user CAN replace his old password with new',
                  verb: 'post',
                  auth: profiles.user,
                  url: () => `${apiUrl}set-new-password`,
                  body: () => ({
                    oldPassword: profiles.user.password,
                    newPassword: 'TRICKYPASSWORD',
                  }),
                  expect: 200,
                },
                {
                  name: 'everyone CANNOT update user password without access token',
                  verb: 'post',
                  url: () => `${apiUrl}update-password-from-token`,
                  body: () => ({
                    newPassword: 'TRICKYPASSWORD',
                  }),
                  expect: 400,
                },
                {
                  name: 'everyone CANNOT update user password with invalid access token',
                  verb: 'post',
                  url: () => `${apiUrl}update-password-from-token`,
                  body: () => ({
                    accessToken: { id: 1, userId: 4 },
                    newPassword: 'TRICKYPASSWORD',
                  }),
                  expect: 401,
                },
                {
                  name: 'everyone CAN update user password with valid access token',
                  steps: [
                    {
                      verb: 'post',
                      url: () => `${loginUrl}`,
                      body: profiles.admin,
                      expect: 200,
                    },
                    (step0Response) => ({
                      verb: 'post',
                      headers: () => ({
                        authorization: step0Response.body.id.toString(),
                      }),
                      url: () => `${apiUrl}update-password-from-token`,
                      body: () => ({
                        // oldPassword: 'TRICKYPASSWORD',
                        // newPassword: profiles.user.password,
                        oldPassword: profiles.admin.password,
                        newPassword: 'TRICKYPASSWORD',
                        accessToken: step0Response.body,
                      }),
                      expect: (resp) => {
                        expect(resp.status).to.be.equal(200);
                        expect(resp.body.success).to.be.equal(true);
                      },
                    }),
                  ],
                },
              ],
            },
            // test rate limiter
          },
        },
      };

      const testConfig = {
        auth: { url: loginUrl },
        error: (err) => {
          console.error('TEST ERR', err.error);
        },
      };

      lbe2e(app, testConfig, e2eTestsSuite);
    });

    describe(`${collectionName} MQTT`, function () {
      this.timeout(delayBeforeTesting);

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

      it('everyone CANNOT connect to backend', function (done) {
        const testMaxDuration = 2000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);

        const client = mqtt.connect(app.get('mqtt url'));
        client.once('error', (e) => {
          expect(e.code).to.be.equal(4);
          client.end(true);
          done();
        });
        client.once('connect', () => {
          client.end(true);
          done(new Error('Should not connect'));
        });
      });

      it('user CANNOT connect with wrong credentials', function (done) {
        const testMaxDuration = 2000;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);
        const client = mqtt.connect(
          app.get('mqtt url'),
          clientFactory(users[3], 'user', 'wrong token'),
        );

        client.once('error', (e) => {
          expect(e.code).to.be.equal(4);
          client.end(true);
          done();
        });

        client.once('connect', () => {
          client.end(true);
          done(new Error('Should not connect'));
        });
      });

      it('user CAN connect and its status is updated accordingly', async function () {
        const testMaxDuration = 2500;
        this.timeout(testMaxDuration);
        this.slow(testMaxDuration / 2);
        // password has been changed on previous steps
        const token = await UserModel.login(
          { ...profiles.admin, password: 'TRICKYPASSWORD' },
          'user',
        );
        const client = mqtt.connect(app.get('mqtt url'), clientFactory(users[3], 'user', token.id));

        const packet = await clientEvent(client, 'connect');
        expect(packet.returnCode).to.be.equal(0);
        await timeout(async () => {
          const userClients = await ClientModel.find({ filter: { match: client.clientId } });
          expect(userClients[0].status).to.be.equal(true);
          client.end(true);
        }, 250);

        return timeout(async () => {
          const userClients = await ClientModel.find({ filter: { match: client.clientId } });
          expect(
            userClients.some(
              (userClient) =>
                userClient.model === 'User' && userClient.username === users[3].id.toString(),
            ).length,
          ).to.be.equal(undefined);
        }, 250);
      });
    });
  });
};

setTimeout(() => {
  userTest();
  run();
}, delayBeforeTesting * 1.5);
