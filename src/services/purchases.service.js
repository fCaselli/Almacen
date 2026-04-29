import { AppError } from '../errors/AppError.js';
import { lotsRepository } from '../repositories/lots.repository.js';
import { productsRepository } from '../repositories/products.repository.js';
import { purchasesRepository } from '../repositories/purchases.repository.js';
import { stockAdjustmentsRepository } from '../repositories/stock-adjustments.repository.js';
import { buildContainsRegex, cleanObject, normalizeText, now, objectIdOrNull, parseDateOrNull } from '../utils/common.js';
import { buildPaginationMeta, parsePagination, parseSort } from '../utils/pagination.js';
import { serializePurchase } from '../utils/serialize.js';
import { validatePurchaseInput } from '../validators/purchase.validator.js';
import { logAudit } from './audit.service.js';

const PURCHASE_SORTS = {
  purchasedAt: 'purchasedAt',
  total: 'total',
  paidAmount: 'paidAmount',
  balance: 'balance',
  providerName: 'providerName',
  status: 'status',
  reference: 'reference',
  updatedAt: 'updatedAt',
};

function buildPurchasesFilter(query = {}) {
  const q = buildContainsRegex(query.q);
  const status = normalizeText(query.status).toLowerCase();
  const providerId = objectIdOrNull(query.providerId);
  const dateFrom = parseDateOrNull(query.dateFrom);
  const dateTo = parseDateOrNull(query.dateTo);
  if (dateTo) dateTo.setHours(23, 59, 59, 999);
  const filter = cleanObject({
    ...(providerId ? { providerId } : {}),
    ...(['pending', 'received', 'canceled'].includes(status) ? { status } : {}),
  });

  if (q) {
    filter.$or = [
      { reference: q },
      { providerName: q },
      { status: q },
      { notes: q },
    ];
  }

  if (dateFrom || dateTo) {
    filter.purchasedAt = cleanObject({
      ...(dateFrom ? { $gte: dateFrom } : {}),
      ...(dateTo ? { $lte: dateTo } : {}),
    });
  }

  return filter;
}

async function registerPurchaseReceipt(purchase, productBefore, line) {
  const result = await stockAdjustmentsRepository.insertOne({
    lotId: null,
    lotCode: line.lotCode || null,
    productId: line.productId,
    productName: line.productName,
    supplierId: purchase.providerId,
    supplierName: purchase.providerName,
    quantity: line.quantity,
    action: 'purchase-receipt',
    reason: 'compra',
    notes: `Ingreso por compra ${purchase.reference}`,
    responsible: 'sistema',
    unitCost: Number(line.unitCost || 0),
    estimatedCost: Number(line.subtotal || 0),
    stockBefore: Number(productBefore.stock || 0),
    stockAfter: Number(productBefore.stock || 0) + Number(line.quantity || 0),
    createdAt: now(),
  });

  return result.insertedId;
}

async function applyPurchaseToInventory(purchase) {
  const progress = {
    productSnapshots: [],
    createdLotIds: [],
    createdAdjustmentIds: [],
  };

  for (const line of purchase.lines) {
    const product = await productsRepository.findById(line.productId);
    if (!product) throw new AppError(`No encontramos el producto ${line.productName}.`, 404, null, 'PURCHASE_PRODUCT_NOT_FOUND');

    progress.productSnapshots.push({
      _id: product._id,
      stock: Number(product.stock || 0),
      supplierId: product.supplierId || null,
      supplierName: product.supplierName || '',
    });

    await productsRepository.updateOne(
      { _id: line.productId },
      {
        $inc: { stock: line.quantity },
        $set: {
          updatedAt: now(),
          supplierName: purchase.providerName,
          supplierId: purchase.providerId,
        },
      },
    );

    if (line.expiry) {
      const lotInsert = await lotsRepository.insertOne({
        productId: line.productId,
        productName: line.productName,
        supplierId: purchase.providerId,
        supplierName: purchase.providerName,
        quantity: line.quantity,
        remainingQuantity: line.quantity,
        unitCost: line.unitCost,
        expiry: line.expiry,
        lotCode: line.lotCode,
        purchaseReference: purchase.reference,
        purchasedAt: purchase.purchasedAt,
        createdAt: now(),
        updatedAt: now(),
      });
      progress.createdLotIds.push(lotInsert.insertedId);
    }

    const adjustmentId = await registerPurchaseReceipt(purchase, product, line);
    progress.createdAdjustmentIds.push(adjustmentId);
  }

  return progress;
}

async function rollbackInventory(progress) {
  if (!progress) return;

  if (progress.createdLotIds.length) {
    await lotsRepository.deleteMany({ _id: { $in: progress.createdLotIds } });
  }

  if (progress.createdAdjustmentIds.length) {
    await stockAdjustmentsRepository.deleteMany({ _id: { $in: progress.createdAdjustmentIds } });
  }

  for (const snapshot of progress.productSnapshots) {
    await productsRepository.updateById(snapshot._id, {
      $set: {
        stock: snapshot.stock,
        supplierId: snapshot.supplierId,
        supplierName: snapshot.supplierName,
        updatedAt: now(),
      },
    });
  }
}

export async function listPurchases(query = {}) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 10, maxLimit: 100 });
  const { sort, order } = parseSort(query, {
    defaultSort: 'purchasedAt',
    defaultOrder: 'desc',
    allowedSorts: Object.keys(PURCHASE_SORTS),
  });

  const filter = buildPurchasesFilter(query);
  const mongoSort = { [PURCHASE_SORTS[sort] || 'purchasedAt']: order === 'asc' ? 1 : -1 };

  const [docs, total] = await Promise.all([
    purchasesRepository.findPaged(filter, { sort: mongoSort, skip, limit }),
    purchasesRepository.countDocuments(filter),
  ]);

  return {
    items: docs.map(serializePurchase),
    meta: buildPaginationMeta({ total, page, limit, sort, order }),
  };
}

export async function getPurchaseById(id) {
  const purchase = await purchasesRepository.findById(id);
  if (!purchase) throw new AppError('Compra no encontrada.', 404, null, 'PURCHASE_NOT_FOUND');
  return { item: serializePurchase(purchase) };
}

export async function createPurchase(body) {
  const validated = await validatePurchaseInput(body);
  const purchaseDoc = {
    ...validated.purchase,
    inventoryStatus: validated.purchase.status === 'received' ? 'applying' : 'pending',
  };

  const purchaseInsert = await purchasesRepository.insertOne(purchaseDoc);
  let progress = null;

  try {
    if (purchaseDoc.status === 'received') {
      progress = await applyPurchaseToInventory(purchaseDoc);
      await purchasesRepository.updateById(purchaseInsert.insertedId, {
        $set: {
          inventoryStatus: 'applied',
          updatedAt: now(),
        },
      });
    }

    const created = await purchasesRepository.findById(purchaseInsert.insertedId);

    await logAudit({
      action: 'purchase.create',
      entityType: 'purchase',
      entityId: purchaseInsert.insertedId,
      actor: body.responsible || 'sistema',
      message: `Se registró la compra ${purchaseDoc.reference}.`,
      metadata: {
        providerName: purchaseDoc.providerName,
        total: purchaseDoc.total,
        lines: purchaseDoc.lines.length,
        inventoryStatus: purchaseDoc.status === 'received' ? 'applied' : 'pending',
      },
    });

    return {
      ok: true,
      item: serializePurchase(created),
      message: purchaseDoc.status === 'received'
        ? 'Compra registrada y stock actualizado correctamente.'
        : 'Compra registrada en estado pendiente.',
    };
  } catch (error) {
    try {
      await rollbackInventory(progress);
      await purchasesRepository.deleteById(purchaseInsert.insertedId);
    } catch (rollbackError) {
      throw new AppError(
        'La compra falló y no se pudo revertir completamente. Revisá stock, lotes y ajustes.',
        500,
        {
          originalError: error.message,
          rollbackError: rollbackError.message,
        },
        'PURCHASE_ROLLBACK_FAILED',
      );
    }

    throw error;
  }
}


export async function receivePendingPurchase(id, body = {}) {
  const purchase = await purchasesRepository.findById(id);
  if (!purchase) throw new AppError('Compra no encontrada.', 404, null, 'PURCHASE_NOT_FOUND');
  if (purchase.status !== 'pending') {
    throw new AppError('Solo podés recibir compras en estado pendiente.', 400, null, 'PURCHASE_RECEIVE_INVALID_STATUS');
  }
  if (purchase.inventoryStatus === 'applied') {
    throw new AppError('La compra ya fue aplicada al inventario.', 400, null, 'PURCHASE_ALREADY_APPLIED');
  }

  const actor = normalizeText(body.responsible || 'sistema');
  let progress = null;

  try {
    progress = await applyPurchaseToInventory(purchase);
    await purchasesRepository.updateById(id, {
      $set: {
        status: 'received',
        inventoryStatus: 'applied',
        receivedAt: now(),
        receivedBy: actor,
        receiveNotes: normalizeText(body.notes),
        updatedAt: now(),
      },
    });

    const updated = await purchasesRepository.findById(id);

    await logAudit({
      action: 'purchase.receive',
      entityType: 'purchase',
      entityId: id,
      actor,
      message: `Se recibió la compra ${purchase.reference}.`,
      metadata: {
        providerName: purchase.providerName,
        total: purchase.total,
        lines: purchase.lines.length,
      },
    });

    return {
      ok: true,
      message: 'Compra pendiente recibida y stock actualizado correctamente.',
      item: serializePurchase(updated),
    };
  } catch (error) {
    await rollbackInventory(progress);
    throw error;
  }
}

export async function cancelPendingPurchase(id, body = {}) {
  const purchase = await purchasesRepository.findById(id);
  if (!purchase) throw new AppError('Compra no encontrada.', 404, null, 'PURCHASE_NOT_FOUND');
  if (purchase.status !== 'pending') {
    throw new AppError('Solo podés cancelar compras en estado pendiente.', 400, null, 'PURCHASE_CANCEL_INVALID_STATUS');
  }
  if (purchase.inventoryStatus === 'applied') {
    throw new AppError('No podés cancelar una compra que ya impactó el inventario.', 400, null, 'PURCHASE_CANCEL_APPLIED');
  }

  const actor = normalizeText(body.responsible || 'sistema');
  await purchasesRepository.updateById(id, {
    $set: {
      status: 'canceled',
      inventoryStatus: 'canceled',
      canceledAt: now(),
      canceledBy: actor,
      cancelReason: normalizeText(body.reason),
      cancelNotes: normalizeText(body.notes),
      updatedAt: now(),
    },
  });

  const updated = await purchasesRepository.findById(id);

  await logAudit({
    action: 'purchase.cancel',
    entityType: 'purchase',
    entityId: id,
    actor,
    message: `Se canceló la compra ${purchase.reference}.`,
    metadata: {
      providerName: purchase.providerName,
      total: purchase.total,
      reason: normalizeText(body.reason),
    },
  });

  return {
    ok: true,
    message: 'Compra pendiente cancelada correctamente.',
    item: serializePurchase(updated),
  };
}
