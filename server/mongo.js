
const { MongoClient } = require('mongodb');

let client;
let database;

async function connectMongo() {
  if (database) return database;

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is missing from .env');
  }

  client = new MongoClient(uri);
  await client.connect();

  database = client.db('chitvault_logs');

  console.log('MongoDB Atlas connected successfully!');

  return database;
}

async function logActivity(event) {
  const db = await connectMongo();

  return db.collection('activity_logs').insertOne({
    ...event,
    createdAt: new Date(),
  });
}

module.exports = {
  connectMongo,
  logActivity,
};
