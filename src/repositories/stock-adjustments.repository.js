import { getCollection } from '../config/db.js';

export const stockAdjustmentsRepository = {
  collection() {
    return getCollection('stock_adjustments');
  },
  insertOne(doc, options = {}) {
    return this.collection().insertOne(doc, options);
  },
  deleteMany(filter = {}, options = {}) {
    return this.collection().deleteMany(filter, options);
  },
  findRecent(limit = 20) {
    return this.collection().find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  },
};
