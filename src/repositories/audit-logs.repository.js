import { getCollection } from '../config/db.js';

export const auditLogsRepository = {
  collection() {
    return getCollection('audit_logs');
  },
  insertOne(doc) {
    return this.collection().insertOne(doc);
  },
  findPaged(filter = {}, { sort = { createdAt: -1 }, skip = 0, limit = 25 } = {}) {
    return this.collection().find(filter).sort(sort).skip(skip).limit(limit).toArray();
  },
  countDocuments(filter = {}) {
    return this.collection().countDocuments(filter);
  },
  deleteMany(filter = {}) {
    return this.collection().deleteMany(filter);
  },
};
