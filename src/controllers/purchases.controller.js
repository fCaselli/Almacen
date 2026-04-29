import { objectIdOrNull } from '../utils/common.js';
import { AppError } from '../errors/AppError.js';
import { cancelPendingPurchase, createPurchase, getPurchaseById, listPurchases, receivePendingPurchase } from '../services/purchases.service.js';

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


export async function postReceivePurchase(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de compra inválido.', 400, null, 'PURCHASE_ID_INVALID');
  res.json(await receivePendingPurchase(id, req.body));
}

export async function postCancelPurchase(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de compra inválido.', 400, null, 'PURCHASE_ID_INVALID');
  res.json(await cancelPendingPurchase(id, req.body));
}
