import { objectIdOrNull } from '../utils/common.js';
import { AppError } from '../errors/AppError.js';
import { createProduct, createReorderSuggestion, deleteProduct, listProducts, updateProduct } from '../services/products.service.js';

export async function getProducts(req, res) {
  res.json(await listProducts(req.query));
}

export async function postProduct(req, res) {
  const item = await createProduct(req.body);
  res.status(201).json({ ok: true, message: 'Producto creado correctamente.', item });
}

export async function putProduct(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de producto inválido.', 400, null, 'PRODUCT_ID_INVALID');
  const item = await updateProduct(id, req.body);
  res.json({ ok: true, message: 'Producto actualizado correctamente.', item });
}

export async function removeProduct(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de producto inválido.', 400, null, 'PRODUCT_ID_INVALID');
  res.json(await deleteProduct(id, req.body));
}

export async function postReorderSuggestion(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de producto inválido.', 400, null, 'PRODUCT_ID_INVALID');
  res.status(201).json(await createReorderSuggestion(id, req.body));
}
