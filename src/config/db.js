import { MongoClient } from 'mongodb';
import { env } from './env.js';

let client = null;
let db = null;

export async function connectToDatabase() {
  if (db) return { client, db };
  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db(env.DB_NAME);
  return { client, db };
}

export function getDb() {
  if (!db) throw new Error('La base de datos no está inicializada.');
  return db;
}

export function getCollection(name) {
  return getDb().collection(name);
}

export function getCollections() {
  return {
    products: getCollection('products'),
    providers: getCollection('providers'),
    purchases: getCollection('purchases'),
    lots: getCollection('lots'),
    alertResolutions: getCollection('alert_resolutions'),
    reorderRequests: getCollection('reorder_requests'),
    stockAdjustments: getCollection('stock_adjustments'),
  };
}

export async function closeDatabase() {
  await client?.close();
  client = null;
  db = null;
}
