import { AppError } from '../errors/AppError.js';
import { lotsRepository } from '../repositories/lots.repository.js';
import { productsRepository } from '../repositories/products.repository.js';
import { providersRepository } from '../repositories/providers.repository.js';
import { purchasesRepository } from '../repositories/purchases.repository.js';
import { reorderRequestsRepository } from '../repositories/reorder-requests.repository.js';
import { asCurrencyNumber, normalizeKey, normalizeText, now } from '../utils/common.js';
import { serializeDocument, serializeProduct } from '../utils/serialize.js';
import { validateProductInput } from '../validators/product.validator.js';
import { logAudit } from './audit.service.js';

export async function listProducts(query = {}) {
  const q = normalizeText(query.q).toLowerCase();
  const category = normalizeText(query.category);
  const status = normalizeText(query.status);
  const sort = normalizeText(query.sort || 'name');

  const docs = await productsRepository.findAll();
  const filtered = docs.filter((item) => {
    const haystack = [item.name, item.category, item.supplierName, item.location, item.barcode].join(' ').toLowerCase();
    const matchesQuery = !q || haystack.includes(q);
    const matchesCategory = !category || item.category === category;
    let matchesStatus = true;
    if (status === 'low') matchesStatus = Number(item.stock || 0) <= Number(item.minStock || 0);
    if (status === 'ok') matchesStatus = Number(item.stock || 0) > Number(item.minStock || 0);
    if (status === 'empty') matchesStatus = Number(item.stock || 0) <= 0;
    return matchesQuery && matchesCategory && matchesStatus;
  });

  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name, 'es'),
    category: (a, b) => a.category.localeCompare(b.category, 'es'),
    stock: (a, b) => Number(b.stock || 0) - Number(a.stock || 0),
    price: (a, b) => Number(b.price || 0) - Number(a.price || 0),
    updatedAt: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  };

  filtered.sort(sorters[sort] || sorters.name);

  return {
    items: filtered.map(serializeProduct),
    meta: {
      total: filtered.length,
      categories: [...new Set(docs.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    },
  };
}

export async function createProduct(body) {
  const payload = validateProductInput(body);
  const existing = await productsRepository.findByNormalizedName(payload.normalizedName);
  if (existing) throw new AppError('Ya existe un producto con ese nombre.', 409, null, 'PRODUCT_DUPLICATE');

  const supplier = payload.supplierName ? await providersRepository.findByNormalizedName(payload.supplierName ? payload.supplierName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : '') : null;
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

  const supplier = payload.supplierName ? await providersRepository.findByNormalizedName(payload.supplierName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()) : null;
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
