import { AppError } from '../errors/AppError.js';
import { lotsRepository } from '../repositories/lots.repository.js';
import { productsRepository } from '../repositories/products.repository.js';
import { providersRepository } from '../repositories/providers.repository.js';
import { purchasesRepository } from '../repositories/purchases.repository.js';
import { reorderRequestsRepository } from '../repositories/reorder-requests.repository.js';
import { asCurrencyNumber, buildContainsRegex, cleanObject, normalizeKey, normalizeText, now } from '../utils/common.js';
import { buildPaginationMeta, parsePagination, parseSort } from '../utils/pagination.js';
import { serializeDocument, serializeProduct } from '../utils/serialize.js';
import { validateProductInput } from '../validators/product.validator.js';
import { logAudit } from './audit.service.js';

const PRODUCT_SORTS = {
  name: 'name',
  category: 'category',
  stock: 'stock',
  price: 'price',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
};

function buildProductsFilter(query = {}) {
  const q = buildContainsRegex(query.q);
  const category = normalizeText(query.category);
  const status = normalizeText(query.status).toLowerCase();
  const filter = cleanObject({
    ...(category ? { category } : {}),
  });

  if (q) {
    filter.$or = [
      { name: q },
      { category: q },
      { supplierName: q },
      { location: q },
      { barcode: q },
    ];
  }

  if (status === 'low') {
    filter.$expr = { $lte: ['$stock', '$minStock'] };
  } else if (status === 'ok') {
    filter.$expr = { $gt: ['$stock', '$minStock'] };
  } else if (status === 'empty') {
    filter.stock = { $lte: 0 };
  }

  return filter;
}

export async function listProducts(query = {}) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 12, maxLimit: 100 });
  const { sort, order } = parseSort(query, {
    defaultSort: 'name',
    defaultOrder: 'asc',
    allowedSorts: Object.keys(PRODUCT_SORTS),
  });

  const filter = buildProductsFilter(query);
  const mongoSort = { [PRODUCT_SORTS[sort] || 'name']: order === 'asc' ? 1 : -1 };

  const [docs, total, categories] = await Promise.all([
    productsRepository.findPaged(filter, { sort: mongoSort, skip, limit }),
    productsRepository.countDocuments(filter),
    productsRepository.distinctCategories({}),
  ]);

  return {
    items: docs.map(serializeProduct),
    meta: buildPaginationMeta({
      total,
      page,
      limit,
      sort,
      order,
      extra: {
        categories: categories.filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')),
      },
    }),
  };
}

export async function createProduct(body) {
  const payload = validateProductInput(body);
  const existing = await productsRepository.findByNormalizedName(payload.normalizedName);
  if (existing) throw new AppError('Ya existe un producto con ese nombre.', 409, null, 'PRODUCT_DUPLICATE');

  const supplierNormalizedName = normalizeKey(payload.supplierName);
  const supplier = supplierNormalizedName ? await providersRepository.findByNormalizedName(supplierNormalizedName) : null;
  const doc = {
    ...payload,
    supplierId: supplier?._id || null,
    createdAt: now(),
  };

  const result = await productsRepository.insertOne(doc);
  const created = await productsRepository.findById(result.insertedId);

  await logAudit({
    action: 'product.create',
    entityType: 'product',
    entityId: result.insertedId,
    actor: body.responsible || 'sistema',
    message: `Se creó el producto ${payload.name}.`,
  });

  return serializeProduct(created);
}

export async function updateProduct(id, body) {
  const payload = validateProductInput(body);
  const duplicate = await productsRepository.findDuplicateNormalizedName(payload.normalizedName, id);
  if (duplicate) throw new AppError('Ya existe otro producto con ese nombre.', 409, null, 'PRODUCT_DUPLICATE');

  const existing = await productsRepository.findById(id);
  if (!existing) throw new AppError('Producto no encontrado.', 404, null, 'PRODUCT_NOT_FOUND');

  const supplierNormalizedName = normalizeKey(payload.supplierName);
  const supplier = supplierNormalizedName ? await providersRepository.findByNormalizedName(supplierNormalizedName) : null;
  const updated = await productsRepository.updateById(
    id,
    { $set: { ...payload, supplierId: supplier?._id || null } },
    { returnDocument: 'after' },
  );

  await logAudit({
    action: 'product.update',
    entityType: 'product',
    entityId: id,
    actor: body.responsible || 'sistema',
    message: `Se actualizó el producto ${updated.name}.`,
    metadata: {
      before: { price: existing.price, stock: existing.stock, minStock: existing.minStock, category: existing.category },
      after: { price: updated.price, stock: updated.stock, minStock: updated.minStock, category: updated.category },
    },
  });

  return serializeProduct(updated);
}

export async function deleteProduct(id, body = {}) {
  const existing = await productsRepository.findById(id);
  if (!existing) throw new AppError('Producto no encontrado.', 404, null, 'PRODUCT_NOT_FOUND');

  const purchaseCount = await purchasesRepository.countDocuments({ 'lines.productId': id });
  if (purchaseCount > 0) {
    throw new AppError('No podés borrar este producto porque ya tiene compras asociadas.', 400, null, 'PRODUCT_IN_USE');
  }

  await lotsRepository.deleteMany({ productId: id });
  const result = await productsRepository.deleteById(id);
  if (!result.deletedCount) throw new AppError('Producto no encontrado.', 404, null, 'PRODUCT_NOT_FOUND');

  await logAudit({
    action: 'product.delete',
    entityType: 'product',
    entityId: id,
    actor: body.responsible || 'sistema',
    message: `Se eliminó el producto ${existing.name}.`,
  });

  return { ok: true, message: 'Producto eliminado.' };
}

export async function createReorderSuggestion(id, body = {}) {
  const product = await productsRepository.findById(id);
  if (!product) throw new AppError('Producto no encontrado.', 404, null, 'PRODUCT_NOT_FOUND');

  const currentStock = Number(product.stock || 0);
  const minStock = Number(product.minStock || 0);
  const targetStock = Math.max(Number(body.targetStock || minStock), minStock, 1);
  const suggestedQuantity = Math.max(targetStock - currentStock, 1);

  const doc = {
    productId: product._id,
    productName: product.name,
    supplierId: product.supplierId || null,
    supplierName: product.supplierName || null,
    currentStock,
    minStock,
    targetStock,
    suggestedQuantity,
    reason: normalizeText(body.reason || 'low-stock-alert'),
    notes: normalizeText(body.notes || `Reposición sugerida para ${product.name}`),
    status: 'pending',
    createdAt: now(),
    updatedAt: now(),
  };

  const result = await reorderRequestsRepository.insertOne(doc);

  await logAudit({
    action: 'product.reorder_suggestion',
    entityType: 'product',
    entityId: id,
    actor: body.responsible || 'sistema',
    message: `Se generó una sugerencia de compra para ${product.name}.`,
    metadata: { targetStock, suggestedQuantity },
  });

  return {
    ok: true,
    message: 'Se generó una compra sugerida para este producto.',
    item: serializeDocument({ ...doc, _id: result.insertedId }),
    suggestion: {
      targetStock,
      suggestedQuantity,
      estimatedUnitCost: asCurrencyNumber(body.estimatedUnitCost || 0),
    },
  };
}
