/* eslint-disable import/no-extraneous-dependencies */
import { expect } from 'chai';
import lbe2e from 'lb-declarative-e2e-test';
import app from '../index';
import testHelper from '../services/test-helper';
// import mails from '../services/mails';

require('@babel/register');

const delayBeforeTesting = 7000;

const userTest = () => {
  const userFactory = testHelper.factories.user;
  const loginUrl = '/api/Users/login';
  const collectionName = 'Users';
  const apiUrl = `/api/${collectionName}/`;

  describe(collectionName, function() {
    this.timeout(4000);

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

    const getUser0Url = () => `${apiUrl}${userModels[0].id}`;

    const e2eTestsSuite = {
      [`[TEST] ${collectionName} E2E Tests`]: {
        async before() {
          this.timeout(5000);
          const result = await Promise.all([
            testHelper.access.admin.create(app),
            UserModel.create(users),
          ]);

          userModels = result[1];
          userModels.push(result[0]);
          // console.log('userModels', userModels);

          // todo handle emailVerification ..
          // const promises = await userModels.map(async user => {
          //   if (!user.emailVerified) {
          //     const response = await mails.verifyEmail(user);
          //      console.log('response after save ', response);
          //     if (response && response.user) {
          //       await userModel.confirm(user.id, response.user.verificationToken, 'http://ed-X510URR:8080/login');
          //     }
          //   }
          //   return user;
          // });
          // await Promise.all(promises);

          return result;
        },
        after: () => Promise.all([UserModel.destroyAll()]),
        tests: {
          '[TEST] Verifying "Create" access': {
            tests: [
              {
                name: 'everyone CAN create "role: user" user',
                verb: 'post',
                url: apiUrl,
                body: userFactory(undefined, 'user'),
                expect: 200,
              },
              {
                name: 'everyone CANNOT create "role: admin" user',
                verb: 'post',
                url: apiUrl,
                body: userFactory(undefined, 'admin'),
                expect: 403,
              },
              {
                name: 'user CANNOT create "role: admin" user',
                verb: 'post',
                url: apiUrl,
                auth: profiles.user,
                body: userFactory(undefined, 'admin'),
                expect: 403,
              },
              {
                name: 'admin CAN create "role: user" user',
                verb: 'post',
                url: apiUrl,
                auth: profiles.admin,
                body: userFactory(undefined, 'user'),
                expect: 200,
              },
              {
                name: 'admin CAN create "role: admin" user',
                verb: 'post',
                url: apiUrl,
                auth: profiles.admin,
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
                url: getUser0Url,
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
                url: () => `${apiUrl}${userModels[1].id}`,
                auth: profiles.user, // user 0
                expect: 401,
              },
              {
                name: 'user CANNOT read user list',
                verb: 'get',
                url: apiUrl,
                auth: profiles.user,
                expect: 401,
              },
              {
                name: 'user CAN read his OWN details',
                verb: 'get',
                url: getUser0Url,
                auth: profiles.user,
                expect: 200,
              },
              {
                name: "user's password is NOT sent to client",
                verb: 'get',
                url: getUser0Url,
                auth: [profiles.user, profiles.admin],
                expect: res => expect(res.body.password).to.be.undefined,
              },
              {
                name: 'admin CAN read user details',
                verb: 'get',
                url: getUser0Url,
                auth: profiles.admin,
                expect: 200,
              },
              {
                name: 'admin CAN read user list',
                verb: 'get',
                url: apiUrl,
                auth: profiles.admin,
                expect: 200,
              },
            ],
          },
          '[TEST] Verifying "Update" access': {
            tests: [
              {
                name: "everyone CANNOT update user's details",
                verb: 'patch',
                url: getUser0Url,
                body: { firstName: 'coffee' },
                expect: 401,
              },
              {
                name: "user CANNOT update user's details",
                verb: 'patch',
                url: () => `${apiUrl}${userModels[1].id}`,
                auth: profiles.user, // user 0
                body: { firstName: 'coffee' },
                expect: 401,
              },
              {
                name: 'user CAN update his OWN details',
                verb: 'patch',
                url: getUser0Url,
                auth: profiles.user,
                body: { firstName: 'coffee' },
                expect: 200,
              },
              {
                name: 'user CANNOT update his OWN details to "role: admin"',
                verb: 'patch',
                url: getUser0Url,
                auth: profiles.user,
                body: { role: 'admin' },
                expect: 403,
              },

              {
                name: "admin CAN update user's details",
                verb: 'patch',
                url: getUser0Url,
                auth: profiles.admin,
                body: { firstName: 'coffee' },
                expect: 200,
              },
              {
                name: "admin CANNOT update user's password",
                verb: 'patch',
                url: getUser0Url,
                auth: profiles.admin,
                body: { password: 'someEasyOnes' },
                expect: 403,
              },
              {
                name: 'admin CAN update user\'s details to "role: admin"',
                verb: 'patch',
                url: getUser0Url,
                auth: profiles.admin,
                body: { role: 'admin' },
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
                    url: () => `${apiUrl}login`,
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
}, delayBeforeTesting);
