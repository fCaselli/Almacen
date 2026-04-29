import { AppError } from '../errors/AppError.js';
import { asCurrencyNumber, normalizeKey, normalizeText, now } from '../utils/common.js';

export function validateProductInput(body = {}) {
  const name = normalizeText(body.name);
  const category = normalizeText(body.category);
  const supplierName = normalizeText(body.supplierName);
  const location = normalizeText(body.location);
  const barcode = normalizeText(body.barcode);
  const price = asCurrencyNumber(body.price);
  const stock = Number(body.stock ?? 0);
  const minStock = Number(body.minStock ?? 0);

  if (!name || name.length < 2) throw new AppError('El nombre es obligatorio y debe tener al menos 2 caracteres.', 400, null, 'PRODUCT_NAME_INVALID');
  if (name.length > 120) throw new AppError('El nombre del producto es demasiado largo.', 400, null, 'PRODUCT_NAME_TOO_LONG');
  if (!category) throw new AppError('La categoría es obligatoria.', 400, null, 'PRODUCT_CATEGORY_REQUIRED');
  if (!Number.isFinite(price) || price < 0) throw new AppError('El precio debe ser un número válido.', 400, null, 'PRODUCT_PRICE_INVALID');
  if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) throw new AppError('El stock debe ser un entero mayor o igual a cero.', 400, null, 'PRODUCT_STOCK_INVALID');
  if (!Number.isFinite(minStock) || minStock < 0 || !Number.isInteger(minStock)) throw new AppError('El stock mínimo debe ser un entero mayor o igual a cero.', 400, null, 'PRODUCT_MIN_STOCK_INVALID');
  if (barcode && barcode.length > 64) throw new AppError('El código de barras es demasiado largo.', 400, null, 'PRODUCT_BARCODE_TOO_LONG');

  return {
    name,
    normalizedName: normalizeKey(name),
    category,
    supplierName,
    location,
    barcode,
    price,
    stock,
    minStock,
    updatedAt: now(),
  };
}
