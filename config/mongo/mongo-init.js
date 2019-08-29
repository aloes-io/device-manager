/* eslint-disable no-undef */
// db.auth(process.env.MONGO_INITDB_ROOT_USER, process.env.MONGO_INITDB_ROOT_PASS)
// db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE)
db.createUser({
  user: 'aloes',
  pwd: 'example',
  roles: [
    {
      role: 'readWrite',
      db: 'aloes_stage',
    },
  ],
});
