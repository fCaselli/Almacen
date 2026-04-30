import { objectIdOrNull } from '../utils/common.js';
import { AppError } from '../errors/AppError.js';
import { createPurchase, getPurchaseById, listPurchases } from '../services/purchases.service.js';

export async function getPurchases(req, res) {
  res.json(await listPurchases(req.query));
}

export async function getPurchase(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de compra inválido.', 400, null, 'PURCHASE_ID_INVALID');
  res.json(await getPurchaseById(id));
}

export async function postPurchase(req, res) {
  res.status(201).json(await createPurchase(req.body));
}
