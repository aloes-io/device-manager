/* eslint-disable import/no-extraneous-dependencies */
import lbe2e from 'lb-declarative-e2e-test';
import app from '../index';
import testHelper from '../services/test-helper';

require('../services/broker');

const delayBeforeTesting = 7000;

function fileTest() {
  const collectionName = 'Files';
  const fileFactory = testHelper.factories.file;
  const fileMetaFactory = testHelper.factories.fileMeta;

  describe(collectionName, function() {
    this.timeout(4000);
    const FileModel = app.models.files;
    const loginUrl = '/api/Users/login';
    const apiUrl = `/api/${collectionName}/`;

    let defaultFile, formData, formDataBody, formDataHeaders, filesMeta, userIds;

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
            this.timeout(9000);
            const result = await Promise.all([
              testHelper.access.admin.create(app),
              testHelper.access.user.create(app),
              fileFactory(),
              fileFactory('formdata'),
            ]);
            userIds = [result[0].id, result[1].id];
            defaultFile = result[2];
            formData = result[3];
            formDataHeaders = formData.getHeaders();
            formDataBody = formData.getBuffer();
            filesMeta = await Promise.all([
              FileModel.uploadBuffer(defaultFile, userIds[0], 'test1.png'),
              FileModel.uploadBuffer(defaultFile, userIds[1], 'test1.png'),
              FileModel.uploadBuffer(defaultFile, userIds[1], 'test2.png'),
            ]);
            return filesMeta;
          } catch (error) {
            console.log(`[TEST] ${collectionName} before:err`, error);
            return error;
          }
        },
        after: () => Promise.all([FileModel.destroyAll(), app.models.user.destroyAll()]),
        tests: {
          '[TEST] Verifying "Create" access': {
            tests: [
              {
                name: 'everyone CANNOT create',
                verb: 'post',
                url: apiUrl,
                body: () => fileMetaFactory(6, { name: 'test', size: 3000 }, userIds[1]),
                expect: 401,
              },
              {
                name: 'user CANNOT create',
                verb: 'post',
                auth: profiles.user,
                url: apiUrl,
                body: () => fileMetaFactory(7, { name: 'test', size: 3000 }, userIds[1]),
                expect: 401,
              },
              {
                name: 'admin CANNOT create',
                verb: 'post',
                auth: profiles.admin,
                url: apiUrl,
                body: () => fileMetaFactory(8, { name: 'test', size: 3000 }, userIds[0]),
                expect: 401,
              },
            ],
          },
          '[TEST] Verifying "Upload" access': {
            tests: [
              {
                name: 'everyone CANNOT upload buffer',
                verb: 'post',
                url: () => `${apiUrl}${userIds[1]}/upload-buffer/test.png`,
                headers: {
                  'Content-Type': 'application/octet-stream',
                },
                body: () => defaultFile,
                expect: 401,
              },
              {
                name: 'user CAN upload formdata',
                steps: [
                  {
                    verb: 'post',
                    url: () => `${loginUrl}`,
                    body: profiles.user,
                    expect: 200,
                  },
                  step0Response => ({
                    url: () => `${apiUrl}${userIds[1]}/upload/test.png`,
                    verb: 'post',
                    body: formDataBody,
                    headers: {
                      ...formDataHeaders,
                      'accept-encoding': 'gzip, deflate',
                      'user-agent': 'node-superagent/3.8.3',
                      authorization: step0Response.body.id.toString(),
                    },
                    expect: 200,
                  }),
                ],
              },
              {
                name: 'user CAN upload buffer',
                verb: 'post',
                auth: profiles.user,
                url: () => `${apiUrl}${userIds[1]}/upload-buffer/test1.png`,
                headers: {
                  'Content-Type': 'application/octet-stream',
                },
                body: () => defaultFile,
                expect: 200,
              },
              {
                name: 'admin CAN upload buffer',
                verb: 'post',
                auth: profiles.admin,
                url: () => `${apiUrl}${userIds[0]}/upload-buffer/test.png`,
                headers: {
                  'Content-Type': 'application/octet-stream',
                },
                body: () => defaultFile,
                expect: 200,
              },
            ],
          },
          '[TEST] Verifying "Read" access': {
            tests: [
              {
                name: 'everyone CANNOT read ONE',
                verb: 'get',
                url: () => `${apiUrl}${filesMeta[1].id}`,
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
                url: () => `${apiUrl}${filesMeta[1].id}`,
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
          '[TEST] Verifying "Download" access': {
            tests: [
              {
                name: 'everyone CANNOT download',
                verb: 'get',
                url: () => `${apiUrl}${userIds[1]}/download/test.png`,
                expect: 401,
              },
              {
                name: 'user CAN download ( from formadata upload )',
                steps: [
                  {
                    verb: 'post',
                    url: () => `${loginUrl}`,
                    body: profiles.user,
                    expect: 200,
                  },
                  step0Response => ({
                    url: () => `${apiUrl}${userIds[1]}/upload/test4.png`,
                    verb: 'post',
                    body: formDataBody,
                    headers: {
                      ...formDataHeaders,
                      'accept-encoding': 'gzip, deflate',
                      'user-agent': 'node-superagent/3.8.3',
                      authorization: step0Response.body.id.toString(),
                    },
                    expect: 200,
                  }),
                  step1Response => ({
                    url: () => `${step1Response.body.url}`,
                    verb: 'get',
                    auth: profiles.user,
                    expect: 200,
                  }),
                ],
              },
              {
                name: 'user CAN download',
                verb: 'get',
                auth: profiles.user,
                url: () => `${apiUrl}${userIds[1]}/download/test1.png`,
                expect: 200,
              },
              {
                name: 'admin CAN download',
                verb: 'get',
                auth: profiles.admin,
                url: () => `${apiUrl}${userIds[0]}/download/test.png`,
                expect: 200,
              },
            ],
          },
          '[TEST] Verifying "Update" access': {
            tests: [
              {
                name: 'everyone CANNOT update',
                verb: 'put',
                url: () => `${apiUrl}${filesMeta[1].id}`,
                body: () => ({
                  ...filesMeta[1],
                  role: `${filesMeta[1].role} - updated`,
                }),
                expect: 401,
              },
              {
                name: 'user CANNOT update ALL',
                verb: 'put',
                auth: profiles.user,
                url: () => `${apiUrl}${filesMeta[0].id}`,
                body: () => ({
                  ...filesMeta[0],
                  role: `${filesMeta[0].role}-updated`,
                }),
                expect: 401,
              },
              {
                name: 'user CAN update OWN',
                verb: 'put',
                auth: profiles.user,
                url: () => `${apiUrl}${filesMeta[1].id}`,
                body: () => ({
                  ...filesMeta[1],
                  role: `${filesMeta[1].role}-updated`,
                }),
                expect: 200,
              },
              {
                name: 'admin CAN update ALL',
                verb: 'put',
                auth: profiles.admin,
                url: () => `${apiUrl}${filesMeta[2].id}`,
                body: () => ({
                  ...filesMeta[2],
                  role: `${filesMeta[2].role}-updated`,
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
                url: () => `${apiUrl}${filesMeta[1].id}`,
                expect: 401,
              },
              {
                name: 'user CAN delete OWN',
                verb: 'delete',
                auth: profiles.user,
                url: () => `${apiUrl}${filesMeta[1].id}`,
                expect: 200,
              },
              {
                name: 'admin CAN delete ALL',
                verb: 'delete',
                auth: profiles.admin,
                url: () => `${apiUrl}${filesMeta[2].id}`,
                expect: 200,
              },
            ],
          },
        },
      },
    };

    const testConfig = {
      // baseUrl: apiUrl,
      auth: { url: loginUrl },
    };

    lbe2e(app, testConfig, e2eTestsSuite);
  });
}

// describe('Connection', () => {
//   let FileModel = app.models.files;

//   before(function(done) {
//     this.timeout(5000);
//     // console.log('app is started', app.isStarted());
//     app.on('started', status => {
//       console.log('app is started', status, app.models.files);
//       FileModel = app.models.files;
//       done();
//     });
//   });

//   const fileFactory = testHelper.factories.file;
//   const fileMetaFactory = testHelper.factories.fileMeta;
//   const loginUrl = '/api/Users/login';
//   const collectionName = 'Files';
//   const apiUrl = `/api/${collectionName}/`;

//   fileTest();
// });

setTimeout(() => {
  fileTest();
  run();
}, delayBeforeTesting);
