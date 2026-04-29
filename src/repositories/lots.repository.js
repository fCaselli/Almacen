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
  updateOne(filter, update, options = {}) {
    return this.collection().updateOne(filter, update, options);
  },
  findExpiringBetween(start, end, limit = 8) {
    return this.collection().find({
      remainingQuantity: { $gt: 0 },
      expiry: { $gte: start, $lte: end },
    }).sort({ expiry: 1 }).limit(limit).toArray();
  },
  insertOne(doc, options = {}) {
    return this.collection().insertOne(doc, options);
  },
  insertMany(docs, options = {}) {
    return this.collection().insertMany(docs, options);
  },
  deleteMany(filter = {}, options = {}) {
    return this.collection().deleteMany(filter, options);
  },
  countDocuments(filter = {}) {
    return this.collection().countDocuments(filter);
  },
};
