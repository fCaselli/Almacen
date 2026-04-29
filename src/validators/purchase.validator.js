import { AppError } from '../errors/AppError.js';
import { productsRepository } from '../repositories/products.repository.js';
import { providersRepository } from '../repositories/providers.repository.js';
import { asCurrencyNumber, normalizeText, objectIdOrNull, parseDateOrNull, now } from '../utils/common.js';

export async function validatePurchaseInput(body = {}) {
  const providerId = objectIdOrNull(body.providerId);
  const reference = normalizeText(body.reference).toUpperCase();
  const status = normalizeText(body.status || 'received').toLowerCase();
  const paidAmount = asCurrencyNumber(body.paidAmount || 0);
  const notes = normalizeText(body.notes);
  const purchasedAt = parseDateOrNull(body.purchasedAt) || now();
  const linesRaw = Array.isArray(body.lines) ? body.lines : [];

  if (!providerId) throw new AppError('Seleccioná un proveedor válido.', 400, null, 'PURCHASE_PROVIDER_INVALID');
  if (!reference || reference.length < 3) throw new AppError('El comprobante es obligatorio.', 400, null, 'PURCHASE_REFERENCE_REQUIRED');
  if (!linesRaw.length) throw new AppError('Agregá al menos una línea a la compra.', 400, null, 'PURCHASE_LINES_REQUIRED');
  if (!Number.isFinite(paidAmount) || paidAmount < 0) throw new AppError('El importe pagado debe ser válido.', 400, null, 'PURCHASE_PAID_AMOUNT_INVALID');

  const provider = await providersRepository.findById(providerId);
  if (!provider) throw new AppError('No encontramos el proveedor seleccionado.', 404, null, 'PURCHASE_PROVIDER_NOT_FOUND');

  const normalizedLines = [];
  const productIds = [];
  const repeatedProducts = new Set();

  for (const line of linesRaw) {
    const productId = objectIdOrNull(line.productId);
    const quantity = Number(line.quantity);
    const unitCost = asCurrencyNumber(line.unitCost);
    const expiry = parseDateOrNull(line.expiry);
    const lotCode = normalizeText(line.lotCode);

    if (!productId) throw new AppError('Hay una línea con producto inválido.', 400, null, 'PURCHASE_LINE_PRODUCT_INVALID');
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) throw new AppError('Cada línea debe tener una cantidad entera mayor a cero.', 400, null, 'PURCHASE_LINE_QUANTITY_INVALID');
    if (!Number.isFinite(unitCost) || unitCost < 0) throw new AppError('Cada línea debe tener un costo válido.', 400, null, 'PURCHASE_LINE_COST_INVALID');
    if (expiry && expiry.getTime() < purchasedAt.getTime() - 86400000) throw new AppError('No podés cargar un vencimiento anterior a la compra.', 400, null, 'PURCHASE_LINE_EXPIRY_INVALID');

    const key = String(productId);
    if (repeatedProducts.has(key)) {
      throw new AppError('No podés repetir el mismo producto dentro de una misma compra.', 400, null, 'PURCHASE_DUPLICATE_PRODUCT');
    }
    repeatedProducts.add(key);

    productIds.push(productId);
    normalizedLines.push({ productId, quantity, unitCost, expiry, lotCode });
  }

  const productDocs = await productsRepository.collection().find({ _id: { $in: productIds } }).toArray();
  if (productDocs.length !== normalizedLines.length) {
    throw new AppError('Uno o más productos de la compra no existen.', 404, null, 'PURCHASE_PRODUCT_NOT_FOUND');
  }

  const productMap = new Map(productDocs.map((item) => [String(item._id), item]));
  const lines = normalizedLines.map((line) => {
    const product = productMap.get(String(line.productId));
    const subtotal = asCurrencyNumber(line.quantity * line.unitCost);
    return {
      productId: line.productId,
      productName: product.name,
      quantity: line.quantity,
      unitCost: line.unitCost,
      subtotal,
      expiry: line.expiry,
      lotCode: line.lotCode || `${product.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`,
    };
  });

  const total = asCurrencyNumber(lines.reduce((sum, line) => sum + line.subtotal, 0));
  if (paidAmount > total) throw new AppError('El importe pagado no puede ser mayor al total de la compra.', 400, null, 'PURCHASE_PAID_AMOUNT_EXCEEDS_TOTAL');

  return {
    provider,
    purchase: {
      providerId,
      providerName: provider.name,
      reference,
      status: ['pending', 'received'].includes(status) ? status : 'received',
      paidAmount,
      notes,
      purchasedAt,
      lines,
      total,
      balance: asCurrencyNumber(total - paidAmount),
      createdAt: now(),
      updatedAt: now(),
    },
  };
}
