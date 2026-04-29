import { getCollection } from '../config/db.js';

export const providersRepository = {
  collection() {
    return getCollection('providers');
  },
  findAllSorted() {
    return this.collection().find({}).sort({ name: 1 }).toArray();
  },
  findPaged(filter = {}, { sort = { name: 1 }, skip = 0, limit = 10 } = {}) {
    return this.collection().find(filter).sort(sort).skip(skip).limit(limit).toArray();
  },
  findById(_id) {
    return this.collection().findOne({ _id });
  },
  findByName(name) {
    return this.collection().findOne({ name });
  },
  findByNormalizedName(normalizedName) {
    return this.collection().findOne({ normalizedName });
  },
  findDuplicateNormalizedName(normalizedName, _id) {
    return this.collection().findOne({ normalizedName, _id: { $ne: _id } });
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
