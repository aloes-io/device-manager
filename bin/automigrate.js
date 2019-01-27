import path from 'path';

const app = path.resolve(__dirname, '../server/server');
const db = app.datasources.db;
db.autoupdate('Account', (err) => {
  if (err) throw err;

  const accounts = [
    {
      email: 'john.doe@ibm.com',
      createdAt: new Date(),
      lastModifiedAt: new Date(),
    },
    {
      email: 'jane.doe@ibm.com',
      createdAt: new Date(),
      lastModifiedAt: new Date(),
    },
  ];
  let count = accounts.length;
  accounts.forEach((account) => {
    app.models.Account.create(account, (e, model) => {
      if (e) throw e;
      console.log('Created:', model);
      //  count--;
      count -= 1;
      if (count === 0) db.disconnect();
    });
  });
});
