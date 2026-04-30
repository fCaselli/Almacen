import { getCollections } from './db.js';

async function createIndexIfMissing(collection, key, options = {}) {
  const indexes = await collection.indexes();
  const keyText = JSON.stringify(key);
  const existing = indexes.find((index) => JSON.stringify(index.key) === keyText);
  if (existing) return existing.name;
  return collection.createIndex(key, options);
}

export async function ensureIndexes() {
  const { products, providers, purchases, lots, alertResolutions, reorderRequests, stockAdjustments } = getCollections();
  await Promise.all([
    createIndexIfMissing(products, { name: 1 }),
    createIndexIfMissing(products, { category: 1 }),
    createIndexIfMissing(products, { stock: 1 }),
    createIndexIfMissing(providers, { name: 1 }),
    createIndexIfMissing(purchases, { purchasedAt: -1 }),
    createIndexIfMissing(purchases, { providerId: 1 }),
    createIndexIfMissing(lots, { productId: 1, expiry: 1 }),
    createIndexIfMissing(lots, { remainingQuantity: 1, expiry: 1 }),
    createIndexIfMissing(alertResolutions, { alertKey: 1 }),
    createIndexIfMissing(reorderRequests, { productId: 1, createdAt: -1 }),
    createIndexIfMissing(stockAdjustments, { lotId: 1, createdAt: -1 }),
    createIndexIfMissing(stockAdjustments, { productId: 1, createdAt: -1 }),
  ]);
}
