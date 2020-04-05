const path = require('path');

const app = path.resolve(__dirname, '../server/server');
const ds = app.datasources.accountDS;

const account = {
  email: 'bob.doe@ibm.com',
  createdAt: new Date(),
  lastModifiedAt: new Date(),
};
const opts = {
  idInjection: true,
};
const Account = ds.buildModelFromInstance('Account', account, opts);

const instance = new Account(account);
Account.create(instance, (err, model) => {
  if (err) throw err;

  console.log('Created:', model);

  ds.disconnect();
});
