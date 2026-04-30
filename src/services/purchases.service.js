import { AppError } from '../errors/AppError.js';
import { lotsRepository } from '../repositories/lots.repository.js';
import { productsRepository } from '../repositories/products.repository.js';
import { purchasesRepository } from '../repositories/purchases.repository.js';
import { stockAdjustmentsRepository } from '../repositories/stock-adjustments.repository.js';
import { normalizeText, now } from '../utils/common.js';
import { serializePurchase } from '../utils/serialize.js';
import { validatePurchaseInput } from '../validators/purchase.validator.js';
import { logAudit } from './audit.service.js';

async function registerPurchaseReceipt(purchase, product, line) {
  await stockAdjustmentsRepository.insertOne({
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
    stockBefore: Number(product.stock || 0),
    stockAfter: Number(product.stock || 0) + Number(line.quantity || 0),
    createdAt: now(),
  });
}

async function applyPurchaseToInventory(purchase) {
  for (const line of purchase.lines) {
    const product = await productsRepository.findById(line.productId);
    if (!product) throw new AppError(`No encontramos el producto ${line.productName}.`, 404, null, 'PURCHASE_PRODUCT_NOT_FOUND');

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
      await lotsRepository.insertOne({
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
    }

    await registerPurchaseReceipt(purchase, product, line);
  }
}

export async function listPurchases(query = {}) {
  const q = normalizeText(query.q).toLowerCase();
  const docs = await purchasesRepository.findAllSorted();
  const filtered = docs.filter((purchase) => {
    const haystack = [purchase.reference, purchase.providerName, purchase.status].join(' ').toLowerCase();
    return !q || haystack.includes(q);
  });
  return { items: filtered.map(serializePurchase) };
}

export async function getPurchaseById(id) {
  const purchase = await purchasesRepository.findById(id);
  if (!purchase) throw new AppError('Compra no encontrada.', 404, null, 'PURCHASE_NOT_FOUND');
  return { item: serializePurchase(purchase) };
}

export async function createPurchase(body) {
  const validated = await validatePurchaseInput(body);
  await applyPurchaseToInventory(validated.purchase);
  const result = await purchasesRepository.insertOne(validated.purchase);
  const created = await purchasesRepository.findById(result.insertedId);

  await logAudit({
    action: 'purchase.create',
    entityType: 'purchase',
    entityId: result.insertedId,
    actor: body.responsible || 'sistema',
    message: `Se registró la compra ${validated.purchase.reference}.`,
    metadata: {
      providerName: validated.purchase.providerName,
      total: validated.purchase.total,
      lines: validated.purchase.lines.length,
    },
  });

  return { ok: true, item: serializePurchase(created), message: 'Compra registrada correctamente.' };
}
