/* Copyright 2020 Edouard Maleix, read LICENSE */

/* eslint-disable import/no-extraneous-dependencies */
import { expect } from 'chai';
import lbe2e from 'lb-declarative-e2e-test';
import app from '../index';
import broker from '../services/broker';
import testHelper from '../services/test-helper';
// import mails from '../services/mails';

const delayBeforeTesting = 7000;
const restApiPath = `${process.env.REST_API_ROOT}`;
// const restApiPath = `${process.env.REST_API_ROOT}/${process.env.REST_API_VERSION}`;

// todo test MQTT connection as a user
// send contactForm, sendMailInvite
// test rate limiter with x failed login attempts
// test single user deletion
const userTest = () => {
  const userFactory = testHelper.factories.user;
  const loginUrl = `${restApiPath}/Users/login`;
  const collectionName = 'Users';
  const apiUrl = `${restApiPath}/${collectionName}/`;

  describe(`${collectionName} HTTP`, () => {
    // this.timeout(7000);
    const UserModel = app.models.user;
    let userModels;

    const users = Array(2)
      .fill('')
      .map(() => userFactory(undefined, 'user'));

    const profiles = {
      admin: {
        email: testHelper.access.admin.profile.email,
        password: testHelper.access.admin.profile.password,
      },
      user: {
        email: users[0].email,
        password: users[0].password,
      },
    };

    const e2eTestsSuite = {
      [`[TEST] ${collectionName} E2E Tests`]: {
        async before() {
          try {
            this.timeout(delayBeforeTesting);
            const result = await Promise.all([
              testHelper.access.admin.create(app),
              UserModel.create(users),
            ]);

            userModels = result[1];
            userModels.push(result[0]);

            return result;
          } catch (error) {
            console.log(`[TEST] ${collectionName} before:err`, error);
            return null;
          }
        },

        after(done) {
          this.timeout(5000);
          Promise.all([UserModel.destroyAll(), app.stop()])
            .then(() => broker.stop())
            .then(() => done())
            .catch(e => done(e));
        },

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
                url: () => `${apiUrl}${userModels[0].id}`,
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
                url: () => `${apiUrl}${userModels[1].id}`,
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
                url: () => `${apiUrl}${userModels[0].id}`,
                expect: 200,
              },
              {
                name: "user's password is NOT sent to client",
                verb: 'get',
                auth: profiles.admin,
                url: () => `${apiUrl}${userModels[0].id}`,
                expect: res => expect(res.body.password).to.be.undefined,
              },
              {
                name: 'admin CAN read user details',
                verb: 'get',
                auth: profiles.admin,
                url: () => `${apiUrl}${userModels[0].id}`,
                expect: 200,
              },
              {
                name: 'admin CAN read user list',
                verb: 'get',
                auth: profiles.admin,
                url: apiUrl,
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  // expect(resp.body[0].id).to.be.equal(userModels[0].id);
                },
              },
            ],
          },
          '[TEST] Verifying "Update" access': {
            tests: [
              {
                name: "everyone CANNOT update user's details",
                verb: 'patch',
                url: () => `${apiUrl}${userModels[0].id}`,
                body: { firstName: 'test' },
                expect: 401,
              },
              {
                name: "user CANNOT update another user's details",
                verb: 'patch',
                auth: profiles.user, // user 0
                url: () => `${apiUrl}${userModels[1].id}`,
                body: { firstName: 'test' },
                expect: 401,
              },
              {
                name: 'user CAN update his OWN details',
                verb: 'patch',
                auth: profiles.user,
                url: () => `${apiUrl}${userModels[0].id}`,
                body: { firstName: 'test' },
                expect: 200,
              },
              {
                name: 'user CANNOT update his OWN details to "roleName: admin"',
                verb: 'patch',
                auth: profiles.user,
                url: () => `${apiUrl}${userModels[0].id}`,
                body: { roleName: 'admin' },
                expect: 403,
              },

              {
                name: "admin CAN update user's details",
                verb: 'patch',
                auth: profiles.admin,
                url: () => `${apiUrl}${userModels[0].id}`,
                body: { firstName: 'test' },
                expect: 200,
              },
              {
                name: "admin CANNOT update user's password",
                verb: 'patch',
                auth: profiles.admin,
                url: () => `${apiUrl}${userModels[0].id}`,
                body: { password: 'someEasyOnes' },
                expect: 403,
              },
              {
                name: 'admin CAN update user\'s details to "roleName: admin"',
                verb: 'patch',
                auth: profiles.admin,
                url: () => `${apiUrl}${userModels[0].id}`,
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
                url: () => `${apiUrl}${userModels[0].id}`,
                body: () => ({ ...userModels[0], firstName: 'test' }),
                expect: 401,
              },
              {
                name: "user CANNOT replace another user's details",
                verb: 'put',
                auth: profiles.user, // user 0
                url: () => `${apiUrl}${userModels[1].id}`,
                body: () => ({ ...userModels[0], firstName: 'test' }),
                expect: 401,
              },
              {
                name: 'user CAN replace his OWN details',
                verb: 'put',
                auth: profiles.user,
                url: () => `${apiUrl}${userModels[0].id}`,
                body: () => ({ ...userModels[0], firstName: 'test' }),
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.firstName).to.be.equal('test');
                },
              },
              {
                name: "admin CAN replace user's details",
                verb: 'put',
                auth: profiles.admin,
                url: () => `${apiUrl}${userModels[0].id}`,
                body: () => ({ ...userModels[0], firstName: 'test' }),
                expect: resp => {
                  expect(resp.status).to.be.equal(200);
                  expect(resp.body.firstName).to.be.equal('test');
                },
              },
              {
                name: 'admin CAN replace user\'s details with "roleName: user"',
                verb: 'put',
                auth: profiles.admin,
                url: () => `${apiUrl}${userModels[0].id}`,
                body: () => ({ ...userModels[0], roleName: 'user' }),
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
                  step0Response => ({
                    url: () => `${apiUrl}logout?access_token=${step0Response.body.id}`,
                    verb: 'post',
                    expect: 204,
                  }),
                ],
              },
            ],
          },
          '[TEST] Verifying "Authentification" utils': {
            tests: [
              {
                name: 'everyone CAN check if an account exists by email',
                verb: 'post',
                url: () => `${apiUrl}find-by-email`,
                body: () => ({
                  email: profiles.user.email,
                }),
                expect: 200,
              },
              {
                name: 'everyone CAN validate account creation',
                verb: 'post',
                url: () => `${apiUrl}verify-email`,
                body: () => ({
                  user: userModels[1],
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
                name: 'user CANNOT update his password without access token',
                verb: 'post',
                url: () => `${apiUrl}update-password-from-token`,
                body: () => ({
                  newPassword: 'TRICKYPASSWORD',
                }),
                expect: 400,
              },
              {
                name: 'user CAN update his password from access token',
                steps: [
                  {
                    verb: 'post',
                    url: () => `${loginUrl}`,
                    body: profiles.admin,
                    expect: 200,
                  },
                  step0Response => ({
                    verb: 'post',
                    headers: () => ({
                      authorization: step0Response.body.id.toString(),
                    }),
                    url: () => `${apiUrl}update-password-from-token`,
                    body: () => ({
                      newPassword: 'TRICKYPASSWORD',
                      accessToken: step0Response.body,
                    }),
                    expect: resp => {
                      expect(resp.status).to.be.equal(200);
                      expect(resp.body.success).to.be.equal(true);
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
      error: err => {
        console.error('TEST ERR', err.error);
      },
    };

    lbe2e(app, testConfig, e2eTestsSuite);
  });
};

setTimeout(() => {
  userTest();
  run();
}, delayBeforeTesting * 1.5);
