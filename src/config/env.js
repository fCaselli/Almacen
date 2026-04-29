import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT || 3000),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  DB_NAME: process.env.DB_NAME || 'almacen_pro',
};
