import { ensureCollection, getCollections } from './db.js';

async function createIndexIfMissing(collection, key, options = {}) {
  try {
    const indexes = await collection.indexes();
    const keyText = JSON.stringify(key);
    const existing = indexes.find((index) => JSON.stringify(index.key) === keyText);
    if (existing) return existing.name;
    return collection.createIndex(key, options);
  } catch (error) {
    if (error?.codeName === 'NamespaceNotFound') {
      await ensureCollection(collection.collectionName);
      return collection.createIndex(key, options);
    }
    throw error;
  }
}

export async function ensureIndexes() {
  await Promise.all([
    ensureCollection('products'),
    ensureCollection('providers'),
    ensureCollection('purchases'),
    ensureCollection('lots'),
    ensureCollection('alert_resolutions'),
    ensureCollection('reorder_requests'),
    ensureCollection('stock_adjustments'),
    ensureCollection('audit_logs'),
  ]);

  const {
    products,
    providers,
    purchases,
    lots,
    alertResolutions,
    reorderRequests,
    stockAdjustments,
    auditLogs,
  } = getCollections();

  await Promise.all([
    createIndexIfMissing(products, { normalizedName: 1 }),
    createIndexIfMissing(products, { category: 1 }),
    createIndexIfMissing(products, { stock: 1 }),
    createIndexIfMissing(products, { supplierId: 1 }),
    createIndexIfMissing(products, { updatedAt: -1 }),

    createIndexIfMissing(providers, { normalizedName: 1 }),
    createIndexIfMissing(providers, { updatedAt: -1 }),

    createIndexIfMissing(purchases, { purchasedAt: -1 }),
    createIndexIfMissing(purchases, { providerId: 1 }),
    createIndexIfMissing(purchases, { status: 1 }),
    createIndexIfMissing(purchases, { reference: 1 }),

    createIndexIfMissing(lots, { productId: 1, expiry: 1 }),
    createIndexIfMissing(lots, { supplierId: 1, expiry: 1 }),
    createIndexIfMissing(lots, { remainingQuantity: 1, expiry: 1 }),
    createIndexIfMissing(lots, { promotionSuggested: 1, updatedAt: -1 }),

    createIndexIfMissing(alertResolutions, { alertKey: 1 }),
    createIndexIfMissing(reorderRequests, { productId: 1, createdAt: -1 }),
    createIndexIfMissing(stockAdjustments, { lotId: 1, createdAt: -1 }),
    createIndexIfMissing(stockAdjustments, { productId: 1, createdAt: -1 }),
    createIndexIfMissing(auditLogs, { createdAt: -1 }),
    createIndexIfMissing(auditLogs, { entityType: 1, createdAt: -1 }),
  ]);
}
