import { getCollection } from '../config/db.js';

export const lotsRepository = {
  collection() {
    return getCollection('lots');
  },
  findAllSorted() {
    return this.collection().find({}).sort({ expiry: 1 }).toArray();
  },
  findPaged(filter = {}, { sort = { expiry: 1 }, skip = 0, limit = 10 } = {}) {
    return this.collection().find(filter).sort(sort).skip(skip).limit(limit).toArray();
  },
  findById(_id) {
    return this.collection().findOne({ _id });
  },
  updateById(_id, update, options = {}) {
    return this.collection().findOneAndUpdate({ _id }, update, options);
  },
  findExpiringBetween(start, end, limit = 8) {
    return this.collection().find({
      remainingQuantity: { $gt: 0 },
      expiry: { $gte: start, $lte: end },
    }).sort({ expiry: 1 }).limit(limit).toArray();
  },
  insertOne(doc) {
    return this.collection().insertOne(doc);
  },
  insertMany(docs) {
    return this.collection().insertMany(docs);
  },
  deleteMany(filter = {}) {
    return this.collection().deleteMany(filter);
  },
  countDocuments(filter = {}) {
    return this.collection().countDocuments(filter);
  },
};
