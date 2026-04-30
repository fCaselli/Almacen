import { AppError } from '../errors/AppError.js';
import { lotsRepository } from '../repositories/lots.repository.js';
import { productsRepository } from '../repositories/products.repository.js';
import { stockAdjustmentsRepository } from '../repositories/stock-adjustments.repository.js';
import { asCurrencyNumber, normalizeText, now } from '../utils/common.js';
import { serializeLotWithStatus } from '../utils/serialize.js';
import { logAudit } from './audit.service.js';

export async function listLots(query = {}) {
  const q = normalizeText(query.q).toLowerCase();
  const status = normalizeText(query.status).toLowerCase();
  const days = Number(query.days || 30);
  const sort = normalizeText(query.sort || 'expiry');

  const docs = await lotsRepository.findAllSorted();
  let filtered = docs.filter((lot) => {
    const serialized = serializeLotWithStatus(lot);
    const haystack = [serialized.productName, serialized.supplierName, serialized.lotCode, serialized.purchaseReference].join(' ').toLowerCase();
    const matchesQ = !q || haystack.includes(q);
    const matchesDays = serialized.daysLeft === null || serialized.daysLeft <= days;
    let matchesStatus = true;
    if (status) matchesStatus = serialized.status.toLowerCase() === status;
    return matchesQ && matchesDays && matchesStatus;
  }).map(serializeLotWithStatus);

  const sorters = {
    expiry: (a, b) => new Date(a.expiry || 0) - new Date(b.expiry || 0),
    product: (a, b) => String(a.productName || '').localeCompare(String(b.productName || ''), 'es'),
    quantity: (a, b) => Number(b.remainingQuantity || 0) - Number(a.remainingQuantity || 0),
    cost: (a, b) => Number(b.estimatedCost || 0) - Number(a.estimatedCost || 0),
    purchasedAt: (a, b) => new Date(b.purchasedAt || 0) - new Date(a.purchasedAt || 0),
  };
  filtered.sort(sorters[sort] || sorters.expiry);

  return { items: filtered };
}

async function registerStockAdjustment({ lot, product, quantity, action, reason, notes, responsible }) {
  await stockAdjustmentsRepository.insertOne({
    lotId: lot._id,
    lotCode: lot.lotCode || null,
    productId: lot.productId,
    productName: lot.productName,
    supplierId: lot.supplierId || null,
    supplierName: lot.supplierName || null,
    quantity,
    action,
    reason,
    notes,
    responsible: normalizeText(responsible || 'sistema'),
    unitCost: Number(lot.unitCost || 0),
    estimatedCost: asCurrencyNumber(Number(quantity || 0) * Number(lot.unitCost || 0)),
    stockBefore: Number(product.stock || 0),
    stockAfter: Math.max(Number(product.stock || 0) - Number(quantity || 0), 0),
    createdAt: now(),
  });
}

function resolveAdjustmentQuantity(bodyQuantity, available, label) {
  const quantity = Number(bodyQuantity || available);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    throw new AppError(`${label} debe ser una cantidad entera mayor a cero.`, 400, null, 'LOT_QUANTITY_INVALID');
  }
  if (quantity > available) {
    throw new AppError(`No podés procesar más unidades que las disponibles en el lote (${available}).`, 400, null, 'LOT_QUANTITY_EXCEEDS_AVAILABLE');
  }
  return quantity;
}

async function loadLotAndProduct(id) {
  const lot = await lotsRepository.findById(id);
  if (!lot) throw new AppError('Lote no encontrado.', 404, null, 'LOT_NOT_FOUND');
  const available = Number(lot.remainingQuantity || 0);
  if (available <= 0) throw new AppError('El lote ya no tiene unidades disponibles.', 400, null, 'LOT_EMPTY');

  const product = await productsRepository.findById(lot.productId);
  if (!product) throw new AppError('No encontramos el producto asociado al lote.', 404, null, 'LOT_PRODUCT_NOT_FOUND');
  return { lot, product, available };
}

export async function markLotAsExpired(id, body = {}) {
  const { lot, product, available } = await loadLotAndProduct(id);
  const quantity = resolveAdjustmentQuantity(body.quantity, available, 'La cantidad a descartar');
  const actor = body.responsible || 'sistema';

  await lotsRepository.updateById(
    id,
    {
      $inc: { remainingQuantity: -quantity },
      $set: {
        updatedAt: now(),
        lastAction: 'expired-writeoff',
        expiredProcessedAt: now(),
        expiredNotes: normalizeText(body.notes),
      },
    },
  );

  await productsRepository.updateById(
    lot.productId,
    {
      $set: {
        stock: Math.max(Number(product.stock || 0) - quantity, 0),
        updatedAt: now(),
      },
    },
  );

  await registerStockAdjustment({
    lot,
    product,
    quantity,
    action: 'expired-writeoff',
    reason: normalizeText(body.reason || 'vencimiento'),
    notes: normalizeText(body.notes),
    responsible: actor,
  });

  await logAudit({
    action: 'lot.mark_expired',
    entityType: 'lot',
    entityId: id,
    actor,
    message: `Se marcó como vencido el lote ${lot.lotCode || lot.productName}.`,
    metadata: { quantity, productName: lot.productName },
  });

  const updatedLot = await lotsRepository.findById(id);
  return {
    ok: true,
    message: 'Lote marcado como vencido y descontado del stock.',
    item: serializeLotWithStatus(updatedLot),
  };
}

export async function registerLotWaste(id, body = {}) {
  const { lot, product, available } = await loadLotAndProduct(id);
  const quantity = resolveAdjustmentQuantity(body.quantity || 1, available, 'La cantidad de merma');
  const actor = body.responsible || 'sistema';

  await lotsRepository.updateById(
    id,
    {
      $inc: { remainingQuantity: -quantity },
      $set: {
        updatedAt: now(),
        lastAction: 'waste',
        wasteProcessedAt: now(),
        wasteNotes: normalizeText(body.notes),
      },
    },
  );

  await productsRepository.updateById(
    lot.productId,
    {
      $set: {
        stock: Math.max(Number(product.stock || 0) - quantity, 0),
        updatedAt: now(),
      },
    },
  );

  await registerStockAdjustment({
    lot,
    product,
    quantity,
    action: 'waste',
    reason: normalizeText(body.reason || 'merma'),
    notes: normalizeText(body.notes),
    responsible: actor,
  });

  await logAudit({
    action: 'lot.register_waste',
    entityType: 'lot',
    entityId: id,
    actor,
    message: `Se registró merma sobre el lote ${lot.lotCode || lot.productName}.`,
    metadata: { quantity, productName: lot.productName },
  });

  const updatedLot = await lotsRepository.findById(id);
  return {
    ok: true,
    message: 'Merma registrada y stock actualizado.',
    item: serializeLotWithStatus(updatedLot),
  };
}

export async function promoteLot(id, body = {}) {
  const lot = await lotsRepository.findById(id);
  if (!lot) throw new AppError('Lote no encontrado.', 404, null, 'LOT_NOT_FOUND');

  const updatedLot = await lotsRepository.updateById(
    id,
    {
      $set: {
        updatedAt: now(),
        promotionSuggested: true,
        promotionSuggestedAt: now(),
        promotionStatus: normalizeText(body.status || 'pending'),
        promotionNotes: normalizeText(body.notes || 'Sugerido desde alertas para acelerar salida'),
      },
    },
    { returnDocument: 'after' },
  );

  await logAudit({
    action: 'lot.promote',
    entityType: 'lot',
    entityId: id,
    actor: body.responsible || 'sistema',
    message: `Se marcó para promoción el lote ${lot.lotCode || lot.productName}.`,
  });

  return {
    ok: true,
    message: 'El lote quedó marcado para promoción.',
    item: serializeLotWithStatus(updatedLot),
  };
}
