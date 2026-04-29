import { AppError } from '../errors/AppError.js';
import { lotsRepository } from '../repositories/lots.repository.js';
import { productsRepository } from '../repositories/products.repository.js';
import { stockAdjustmentsRepository } from '../repositories/stock-adjustments.repository.js';
import { asCurrencyNumber, buildContainsRegex, cleanObject, normalizeText, now, objectIdOrNull } from '../utils/common.js';
import { buildPaginationMeta, parsePagination, parseSort } from '../utils/pagination.js';
import { serializeLotWithStatus } from '../utils/serialize.js';
import { logAudit } from './audit.service.js';

const LOT_SORTS = {
  expiry: 'expiry',
  product: 'productName',
  quantity: 'remainingQuantity',
  cost: 'unitCost',
  purchasedAt: 'purchasedAt',
  updatedAt: 'updatedAt',
};

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function buildLotsFilter(query = {}) {
  const q = buildContainsRegex(query.q);
  const status = normalizeText(query.status).toLowerCase();
  const days = Number(query.days || 30);
  const productId = objectIdOrNull(query.productId);
  const supplierId = objectIdOrNull(query.supplierId);
  const today = startOfToday();
  const plus7 = addDays(today, 7);
  const plus30 = addDays(today, 30);
  const plusDays = addDays(today, Math.max(days, 1));

  const and = [];

  if (q) {
    and.push({
      $or: [
        { productName: q },
        { supplierName: q },
        { lotCode: q },
        { purchaseReference: q },
      ],
    });
  }

  if (productId) and.push({ productId });
  if (supplierId) and.push({ supplierId });

  switch (status) {
    case 'agotado':
      and.push({ remainingQuantity: { $lte: 0 } });
      break;
    case 'vencido':
      and.push({ remainingQuantity: { $gt: 0 }, expiry: { $lt: today } });
      break;
    case 'urgente':
      and.push({ remainingQuantity: { $gt: 0 }, expiry: { $gte: today, $lte: plus7 } });
      break;
    case 'por vencer':
      and.push({ remainingQuantity: { $gt: 0 }, expiry: { $gt: plus7, $lte: plus30 } });
      break;
    case 'sin vencimiento':
      and.push({ remainingQuantity: { $gt: 0 } });
      and.push({ $or: [{ expiry: null }, { expiry: { $exists: false } }] });
      break;
    case 'ok':
      and.push({ remainingQuantity: { $gt: 0 } });
      and.push({
        $or: [
          { expiry: { $gt: plus30 } },
          { expiry: null },
          { expiry: { $exists: false } },
        ],
      });
      break;
    default:
      if (Number.isFinite(days) && days > 0) {
        and.push({
          $or: [
            { expiry: { $lte: plusDays } },
            { expiry: null },
            { expiry: { $exists: false } },
          ],
        });
      }
      break;
  }

  return and.length ? { $and: and } : {};
}

export async function listLots(query = {}) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 12, maxLimit: 100 });
  const { sort, order } = parseSort(query, {
    defaultSort: 'expiry',
    defaultOrder: 'asc',
    allowedSorts: Object.keys(LOT_SORTS),
  });

  const filter = buildLotsFilter(query);
  const mongoSort = { [LOT_SORTS[sort] || 'expiry']: order === 'asc' ? 1 : -1 };

  const [docs, total] = await Promise.all([
    lotsRepository.findPaged(filter, { sort: mongoSort, skip, limit }),
    lotsRepository.countDocuments(filter),
  ]);

  return {
    items: docs.map(serializeLotWithStatus),
    meta: buildPaginationMeta({ total, page, limit, sort, order }),
  };
}

async function registerStockAdjustment({ lot, product, quantity, action, reason, notes, responsible }) {
  return stockAdjustmentsRepository.insertOne({
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

  await productsRepository.updateById(lot.productId, {
    $set: {
      stock: Math.max(Number(product.stock || 0) - quantity, 0),
      updatedAt: now(),
    },
  });

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

  await productsRepository.updateById(lot.productId, {
    $set: {
      stock: Math.max(Number(product.stock || 0) - quantity, 0),
      updatedAt: now(),
    },
  });

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
