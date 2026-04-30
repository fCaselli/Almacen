import { getCollection } from '../config/db.js';

export const productsRepository = {
  collection() {
    return getCollection('products');
  },
  findAll() {
    return this.collection().find({}).toArray();
  },
  findSortedByName() {
    return this.collection().find({}).sort({ name: 1 }).toArray();
  },
  findPaged(filter = {}, { sort = { name: 1 }, skip = 0, limit = 10 } = {}) {
    return this.collection().find(filter).sort(sort).skip(skip).limit(limit).toArray();
  },
  distinctCategories(filter = {}) {
    return this.collection().distinct('category', filter);
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
  insertOne(doc) {
    return this.collection().insertOne(doc);
  },
  updateById(_id, update, options = {}) {
    return this.collection().findOneAndUpdate({ _id }, update, options);
  },
  updateOne(filter, update) {
    return this.collection().updateOne(filter, update);
  },
  deleteById(_id) {
    return this.collection().deleteOne({ _id });
  },
  countDocuments(filter = {}) {
    return this.collection().countDocuments(filter);
  },
  deleteMany(filter = {}) {
    return this.collection().deleteMany(filter);
  },
};
