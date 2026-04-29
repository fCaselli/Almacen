import { demoProducts, demoProviders, buildDemoSeed } from '../demo-products.js';
import { alertsRepository } from '../repositories/alerts.repository.js';
import { auditLogsRepository } from '../repositories/audit-logs.repository.js';
import { lotsRepository } from '../repositories/lots.repository.js';
import { productsRepository } from '../repositories/products.repository.js';
import { providersRepository } from '../repositories/providers.repository.js';
import { purchasesRepository } from '../repositories/purchases.repository.js';
import { reorderRequestsRepository } from '../repositories/reorder-requests.repository.js';
import { stockAdjustmentsRepository } from '../repositories/stock-adjustments.repository.js';
import { now, normalizeKey } from '../utils/common.js';
import { logAudit } from './audit.service.js';

export async function seedDemoData() {
  await Promise.all([
    productsRepository.deleteMany({}),
    providersRepository.deleteMany({}),
    purchasesRepository.deleteMany({}),
    lotsRepository.deleteMany({}),
    alertsRepository.collection().deleteMany({}),
    reorderRequestsRepository.collection().deleteMany({}),
    stockAdjustmentsRepository.collection().deleteMany({}),
    auditLogsRepository.deleteMany({}),
  ]);

  const createdAt = now();
  const providerDocs = demoProviders.map((provider) => ({
    ...provider,
    normalizedName: normalizeKey(provider.name),
    createdAt,
    updatedAt: createdAt,
  }));
  const providerInsert = await providersRepository.collection().insertMany(providerDocs);
  const providerIdsByName = {};
  Object.entries(providerInsert.insertedIds).forEach(([index, id]) => {
    providerIdsByName[providerDocs[Number(index)].name] = id;
  });

  const productDocs = demoProducts.map((product) => ({
    ...product,
    normalizedName: normalizeKey(product.name),
    supplierId: providerIdsByName[product.supplierName] || null,
    createdAt,
    updatedAt: createdAt,
  }));
  const productInsert = await productsRepository.collection().insertMany(productDocs);
  const productIdsByName = {};
  Object.entries(productInsert.insertedIds).forEach(([index, id]) => {
    productIdsByName[productDocs[Number(index)].name] = id;
  });

  const { demoLots, demoPurchases } = buildDemoSeed(providerIdsByName, productIdsByName);
  if (demoLots.length) await lotsRepository.insertMany(demoLots);
  if (demoPurchases.length) await purchasesRepository.collection().insertMany(demoPurchases);

  await logAudit({
    action: 'seed.reset_demo',
    entityType: 'system',
    message: 'Se restauraron los datos demo del sistema.',
    metadata: {
      providers: providerDocs.length,
      products: productDocs.length,
      purchases: demoPurchases.length,
      lots: demoLots.length,
    },
  });

  return {
    providers: providerDocs.length,
    products: productDocs.length,
    purchases: demoPurchases.length,
    lots: demoLots.length,
  };
}
