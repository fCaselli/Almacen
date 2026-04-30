import { getCollection } from '../config/db.js';

export const purchasesRepository = {
  collection() {
    return getCollection('purchases');
  },
  findAllSorted() {
    return this.collection().find({}).sort({ purchasedAt: -1 }).toArray();
  },
  findPaged(filter = {}, { sort = { purchasedAt: -1 }, skip = 0, limit = 10 } = {}) {
    return this.collection().find(filter).sort(sort).skip(skip).limit(limit).toArray();
  },
  findRecent(limit = 6) {
    return this.collection().find({}).sort({ purchasedAt: -1 }).limit(limit).toArray();
  },
  findById(_id) {
    return this.collection().findOne({ _id });
  },
  insertOne(doc) {
    return this.collection().insertOne(doc);
  },
  countDocuments(filter = {}) {
    return this.collection().countDocuments(filter);
  },
  deleteMany(filter = {}) {
    return this.collection().deleteMany(filter);
  },
};
