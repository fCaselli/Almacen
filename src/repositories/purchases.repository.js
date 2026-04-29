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
  insertOne(doc, options = {}) {
    return this.collection().insertOne(doc, options);
  },
  updateById(_id, update, options = {}) {
    return this.collection().findOneAndUpdate({ _id }, update, options);
  },
  deleteById(_id, options = {}) {
    return this.collection().deleteOne({ _id }, options);
  },
  countDocuments(filter = {}) {
    return this.collection().countDocuments(filter);
  },
  deleteMany(filter = {}, options = {}) {
    return this.collection().deleteMany(filter, options);
  },
};
