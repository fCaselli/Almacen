import { getCollection } from '../config/db.js';

export const stockAdjustmentsRepository = {
  collection() {
    return getCollection('stock_adjustments');
  },
  insertOne(doc) {
    return this.collection().insertOne(doc);
  },
  findRecent(limit = 20) {
    return this.collection().find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  },
};
