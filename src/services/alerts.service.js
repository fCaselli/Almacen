import { alertsRepository } from '../repositories/alerts.repository.js';
import { lotsRepository } from '../repositories/lots.repository.js';
import { productsRepository } from '../repositories/products.repository.js';
import { normalizeText, now } from '../utils/common.js';
import { calculateDaysLeft } from '../utils/domain.js';
import { serializeDocument, serializeLotWithStatus, serializeProduct } from '../utils/serialize.js';
import { logAudit } from './audit.service.js';

function makeAlertKey(type, id) {
  return `${type}:${id}`;
}

function makeFeedItems({ expiredLots, urgentLots, lowStockProducts, outOfStockProducts }) {
  const feed = [];

  expiredLots.forEach((item) => {
    feed.push({
      key: makeAlertKey('lot-expired', item.id),
      type: 'lot-expired',
      priority: 'critical',
      severity: 'Crítica',
      severityClass: 'critical',
      title: `${item.productName} vencido`,
      subtitle: `Lote ${item.lotCode || 'sin código'}`,
      detail: `Venció ${item.expiry ? new Date(item.expiry).toLocaleDateString('es-AR') : '-'} · ${item.remainingQuantity || 0} u. remanentes`,
      actionLabel: 'Registrar vencido',
      actionType: 'markExpired',
      refId: item.id,
      refText: item.lotCode || item.productName,
    });
  });

  urgentLots.forEach((item) => {
    feed.push({
      key: makeAlertKey('lot-expiring', item.id),
      type: 'lot-expiring',
      priority: item.daysLeft <= 7 ? 'high' : 'medium',
      severity: item.daysLeft <= 7 ? 'Alta' : 'Media',
      severityClass: item.daysLeft <= 7 ? 'high' : 'medium',
      title: `${item.productName} por vencer`,
      subtitle: `Lote ${item.lotCode || 'sin código'}`,
      detail: `Vence ${item.expiry ? new Date(item.expiry).toLocaleDateString('es-AR') : '-'} · ${item.daysLeft ?? '-'} días · ${item.remainingQuantity || 0} u.`,
      actionLabel: 'Mover a promo',
      actionType: 'promoteLot',
      refId: item.id,
      refText: item.lotCode || item.productName,
    });
  });

  outOfStockProducts.forEach((item) => {
    feed.push({
      key: makeAlertKey('product-out-of-stock', item.id),
      type: 'product-out-of-stock',
      priority: 'critical',
      severity: 'Crítica',
      severityClass: 'critical',
      title: `${item.name} sin stock`,
      subtitle: item.category || 'Producto',
      detail: `No hay unidades disponibles. Proveedor: ${item.supplierName || 'sin asignar'}`,
      actionLabel: 'Generar compra',
      actionType: 'buy',
      refId: item.id,
      refText: item.name,
    });
  });

  lowStockProducts.forEach((item) => {
    feed.push({
      key: makeAlertKey('product-low-stock', item.id),
      type: 'product-low-stock',
      priority: Number(item.stock || 0) <= 0 ? 'critical' : 'high',
      severity: Number(item.stock || 0) <= 0 ? 'Crítica' : 'Alta',
      severityClass: Number(item.stock || 0) <= 0 ? 'critical' : 'high',
      title: `${item.name} bajo mínimo`,
      subtitle: item.category || 'Producto',
      detail: `Stock ${item.stock || 0} / mínimo ${item.minStock || 0} · ${item.supplierName || 'sin proveedor'}`,
      actionLabel: 'Sugerir compra',
      actionType: 'buy',
      refId: item.id,
      refText: item.name,
    });
  });

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return feed
    .filter((item, index, arr) => arr.findIndex((other) => other.key === item.key) === index)
    .sort((a, b) => (order[a.priority] ?? 99) - (order[b.priority] ?? 99));
}

function filterByResolved(items, resolvedKeys, keyBuilder) {
  return items.filter((item) => !resolvedKeys.has(keyBuilder(item)));
}

export async function getAlertsData(query = {}) {
  const days = Number(query.days || 30);
  const includeResolved = String(query.includeResolved || '').toLowerCase() === 'true';
  const typeFilter = normalizeText(query.type).toLowerCase();
  const priorityFilter = normalizeText(query.priority).toLowerCase();
  const q = normalizeText(query.q).toLowerCase();

  const allProducts = await productsRepository.findSortedByName();
  const allLots = await lotsRepository.findAllSorted();

  const activeLots = allLots.filter((lot) => Number(lot.remainingQuantity || 0) > 0);
  const expiredLotsBase = activeLots.filter((lot) => {
    const daysLeft = calculateDaysLeft(lot.expiry);
    return daysLeft !== null && daysLeft < 0;
  }).map(serializeLotWithStatus);

  const byDays = (maxDays) => activeLots.filter((lot) => {
    const daysLeft = calculateDaysLeft(lot.expiry);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= maxDays;
  }).map(serializeLotWithStatus);

  const expiring7Base = byDays(7);
  const expiring15Base = byDays(15);
  const expiring30Base = byDays(30);
  const urgentLotsBase = byDays(days);

  const lowStockProductsBase = allProducts
    .filter((product) => Number(product.stock || 0) <= Number(product.minStock || 0))
    .map(serializeProduct);
  const outOfStockProductsBase = allProducts
    .filter((product) => Number(product.stock || 0) <= 0)
    .map(serializeProduct);

  const baseFeed = makeFeedItems({
    expiredLots: expiredLotsBase,
    urgentLots: urgentLotsBase,
    lowStockProducts: lowStockProductsBase,
    outOfStockProducts: outOfStockProductsBase,
  });

  const resolutions = await alertsRepository.findByKeys(baseFeed.map((item) => item.key));
  const resolutionMap = new Map(resolutions.map((item) => [item.alertKey, item]));
  const resolvedKeys = new Set(resolutions.map((item) => item.alertKey));

  let feed = baseFeed.map((item) => ({
    ...item,
    isResolved: resolutionMap.has(item.key),
    resolution: resolutionMap.has(item.key) ? serializeDocument(resolutionMap.get(item.key)) : null,
  }));

  if (!includeResolved) feed = feed.filter((item) => !item.isResolved);
  if (typeFilter) feed = feed.filter((item) => item.type === typeFilter);
  if (priorityFilter) feed = feed.filter((item) => item.priority === priorityFilter);
  if (q) feed = feed.filter((item) => [item.title, item.subtitle, item.detail, item.refText].join(' ').toLowerCase().includes(q));

  const visibleKeys = new Set(feed.map((item) => item.key));
  const filterVisible = (items, keyBuilder) => items.filter((item) => visibleKeys.has(keyBuilder(item)));

  const expiredLots = filterVisible(
    includeResolved ? expiredLotsBase : filterByResolved(expiredLotsBase, resolvedKeys, (item) => makeAlertKey('lot-expired', item.id)),
    (item) => makeAlertKey('lot-expired', item.id),
  );
  const urgentLots = filterVisible(
    includeResolved ? urgentLotsBase : filterByResolved(urgentLotsBase, resolvedKeys, (item) => makeAlertKey('lot-expiring', item.id)),
    (item) => makeAlertKey('lot-expiring', item.id),
  );
  const lowStockProducts = filterVisible(
    includeResolved ? lowStockProductsBase : filterByResolved(lowStockProductsBase, resolvedKeys, (item) => makeAlertKey('product-low-stock', item.id)),
    (item) => makeAlertKey('product-low-stock', item.id),
  );
  const outOfStockProducts = filterVisible(
    includeResolved ? outOfStockProductsBase : filterByResolved(outOfStockProductsBase, resolvedKeys, (item) => makeAlertKey('product-out-of-stock', item.id)),
    (item) => makeAlertKey('product-out-of-stock', item.id),
  );

  const expiring7 = expiring7Base.filter((item) => !resolvedKeys.has(makeAlertKey('lot-expiring', item.id)));
  const expiring15 = expiring15Base.filter((item) => !resolvedKeys.has(makeAlertKey('lot-expiring', item.id)));
  const expiring30 = expiring30Base.filter((item) => !resolvedKeys.has(makeAlertKey('lot-expiring', item.id)));

  return {
    cards: {
      expiring7: expiring7.length,
      expiring15: expiring15.length,
      expiring30: expiring30.length,
      expired: expiredLots.length,
      lowStock: lowStockProducts.length,
      outOfStock: outOfStockProducts.length,
      monitoredLots: activeLots.length,
    },
    urgentLots: urgentLots.slice(0, 10).map((item) => ({ ...item, alertKey: makeAlertKey('lot-expiring', item.id) })),
    expiredLots: expiredLots.slice(0, 10).map((item) => ({ ...item, alertKey: makeAlertKey('lot-expired', item.id) })),
    lowStockProducts: lowStockProducts.slice(0, 10).map((item) => ({ ...item, alertKey: makeAlertKey('product-low-stock', item.id) })),
    outOfStockProducts: outOfStockProducts.slice(0, 10).map((item) => ({ ...item, alertKey: makeAlertKey('product-out-of-stock', item.id) })),
    feed,
    meta: {
      total: feed.length,
      resolved: resolutions.length,
      lastCalculatedAt: now().toISOString(),
    },
  };
}

export async function resolveAlert(alertKey, body = {}) {
  const resolutionType = normalizeText(body.resolutionType || 'reviewed');
  const notes = normalizeText(body.notes);
  const resolvedBy = normalizeText(body.resolvedBy || 'sistema');

  const doc = await alertsRepository.upsertResolved(alertKey, {
    resolutionType,
    notes,
    resolvedBy,
    resolvedAt: now(),
    updatedAt: now(),
  });

  await logAudit({
    action: 'alert.resolve',
    entityType: 'alert',
    entityId: alertKey,
    actor: resolvedBy,
    message: `Se atendió la alerta ${alertKey}.`,
    metadata: { resolutionType },
  });

  return {
    ok: true,
    message: 'Alerta marcada como atendida.',
    item: serializeDocument(doc),
  };
}

export async function reopenAlert(alertKey, body = {}) {
  await alertsRepository.deleteByKey(alertKey);

  await logAudit({
    action: 'alert.reopen',
    entityType: 'alert',
    entityId: alertKey,
    actor: body.responsible || 'sistema',
    message: `La alerta ${alertKey} volvió a quedar activa.`,
  });

  return {
    ok: true,
    message: 'La alerta volvió a quedar activa.',
  };
}
