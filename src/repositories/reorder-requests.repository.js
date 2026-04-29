import { getCollection } from '../config/db.js';

export const reorderRequestsRepository = {
  collection() {
    return getCollection('reorder_requests');
  },
  insertOne(doc) {
    return this.collection().insertOne(doc);
  },
  findPaged(filter = {}, { sort = { createdAt: -1 }, skip = 0, limit = 10 } = {}) {
    return this.collection().find(filter).sort(sort).skip(skip).limit(limit).toArray();
  },
};
