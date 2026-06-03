const Datastore = require('nedb-promises');
const path = require('path');

const dbDir = process.env.DB_PATH || path.join(__dirname, '..');

const db = {
  users: Datastore.create({ filename: path.join(dbDir, 'users.db'), autoload: true }),
  tables: Datastore.create({ filename: path.join(dbDir, 'tables.db'), autoload: true }),
  hands: Datastore.create({ filename: path.join(dbDir, 'hands.db'), autoload: true }),
};

// Ensure unique indexes
db.users.ensureIndex({ fieldName: 'username', unique: true });
db.users.ensureIndex({ fieldName: 'email', unique: true });

module.exports = db;
