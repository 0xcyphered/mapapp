const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async function globalSetup() {
  process.env.NODE_ENV = 'test';
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  global.__MONGOD__ = mongod;
};
