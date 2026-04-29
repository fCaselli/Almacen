import { getCollection } from '../config/db.js';

export const alertsRepository = {
  collection() {
    return getCollection('alert_resolutions');
  },
  findByKeys(keys = []) {
    if (!Array.isArray(keys) || !keys.length) return Promise.resolve([]);
    return this.collection().find({ alertKey: { $in: keys } }).toArray();
  },
  upsertResolved(alertKey, payload) {
    return this.collection().findOneAndUpdate(
      { alertKey },
      {
        $set: {
          alertKey,
          status: 'resolved',
          ...payload,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' },
    );
  },
  deleteByKey(alertKey) {
    return this.collection().deleteOne({ alertKey });
  },
};
