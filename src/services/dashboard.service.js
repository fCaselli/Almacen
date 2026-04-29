import { lotsRepository } from '../repositories/lots.repository.js';
import { productsRepository } from '../repositories/products.repository.js';
import { providersRepository } from '../repositories/providers.repository.js';
import { purchasesRepository } from '../repositories/purchases.repository.js';
import { asCurrencyNumber, sortByLocale } from '../utils/common.js';
import { productStatus } from '../utils/domain.js';
import { serializeDocument, serializeLotWithStatus, serializePurchase } from '../utils/serialize.js';

export async function getDashboardData() {
  const allProducts = await productsRepository.findSortedByName();
  const lowStock = allProducts.filter((item) => Number(item.stock || 0) <= Number(item.minStock || 0));
  const totalUnits = allProducts.reduce((acc, item) => acc + Number(item.stock || 0), 0);
  const stockValue = allProducts.reduce((acc, item) => acc + Number(item.stock || 0) * Number(item.price || 0), 0);
  const categories = [...new Set(allProducts.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const providerCount = await providersRepository.countDocuments();
  const purchaseCount = await purchasesRepository.countDocuments();

  const now = new Date();
  const next30 = new Date(now);
  next30.setDate(next30.getDate() + 30);

  const expiringLots = await lotsRepository.findExpiringBetween(now, next30, 8);
  const recentPurchases = await purchasesRepository.findRecent(6);

  return {
    cards: {
      products: allProducts.length,
      units: totalUnits,
      lowStock: lowStock.length,
      stockValue: asCurrencyNumber(stockValue),
      providers: providerCount,
      purchases: purchaseCount,
    },
    categories,
    lowStock: lowStock.slice(0, 8).sort((a,b)=>sortByLocale(a,b,'name')).map((item) => ({
      ...serializeDocument(item),
      status: productStatus(item),
    })),
    expiringLots: expiringLots.map((item) => serializeLotWithStatus(item)),
    recentPurchases: recentPurchases.map((item) => serializePurchase(item)),
  };
}
