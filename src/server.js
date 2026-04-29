import { createApp } from './app.js';
import { connectToDatabase, closeDatabase } from './config/db.js';
import { env } from './config/env.js';
import { ensureIndexes } from './config/indexes.js';
import { productsRepository } from './repositories/products.repository.js';
import { seedDemoData } from './services/seed.service.js';

const app = createApp();

async function start() {
  await connectToDatabase();
  await ensureIndexes();

  const count = await productsRepository.countDocuments();
  if (count === 0) {
    await seedDemoData();
    console.log('🌱 Datos demo iniciales cargados.');
  }

  app.listen(env.PORT, () => {
    console.log(`✅ Almacén Pro corriendo en http://localhost:${env.PORT}`);
    console.log(`🍃 MongoDB conectada a ${env.DB_NAME}`);
  });
}

start().catch((error) => {
  console.error('❌ Error al iniciar el servidor:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});
