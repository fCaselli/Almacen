import { asCurrencyNumber } from './common.js';
import { calculateDaysLeft, lotStatus, productStatus } from './domain.js';

export function serializeDocument(doc) {
  if (!doc) return null;
  const cloned = { ...doc };
  if (cloned._id) cloned.id = String(cloned._id);
  delete cloned._id;
  return cloned;
}

export function serializeProduct(product) {
  return {
    ...serializeDocument(product),
    status: productStatus(product),
  };
}

export function serializeProvider(provider, extra = {}) {
  return {
    ...serializeDocument(provider),
    ...extra,
  };
}

export function serializePurchase(purchase) {
  const serialized = serializeDocument(purchase);
  serialized.purchasedAt = purchase?.purchasedAt instanceof Date ? purchase.purchasedAt.toISOString() : purchase?.purchasedAt || null;
  serialized.lines = Array.isArray(purchase?.lines)
    ? purchase.lines.map((line) => ({
        ...line,
        productId: line?.productId ? String(line.productId) : null,
        expiry: line?.expiry instanceof Date ? line.expiry.toISOString() : line?.expiry || null,
      }))
    : [];
  return serialized;
}

export function serializeLot(lot) {
  const serialized = serializeDocument(lot);
  serialized.productId = lot?.productId ? String(lot.productId) : null;
  serialized.supplierId = lot?.supplierId ? String(lot.supplierId) : null;
  serialized.expiry = lot?.expiry instanceof Date ? lot.expiry.toISOString() : lot?.expiry || null;
  serialized.purchasedAt = lot?.purchasedAt instanceof Date ? lot.purchasedAt.toISOString() : lot?.purchasedAt || null;
  return serialized;
}

export function serializeLotWithStatus(lot) {
  return {
    ...serializeLot(lot),
    status: lotStatus(lot),
    daysLeft: calculateDaysLeft(lot?.expiry),
    estimatedCost: asCurrencyNumber(Number(lot?.remainingQuantity || 0) * Number(lot?.unitCost || 0)),
  };
}

export function serializeAuditLog(log) {
  const serialized = serializeDocument(log);
  serialized.createdAt = log?.createdAt instanceof Date ? log.createdAt.toISOString() : log?.createdAt || null;
  return serialized;
}
