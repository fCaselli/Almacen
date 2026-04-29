import { objectIdOrNull } from '../utils/common.js';
import { AppError } from '../errors/AppError.js';
import { listLots, markLotAsExpired, promoteLot, registerLotWaste } from '../services/lots.service.js';

export async function getLots(req, res) {
  res.json(await listLots(req.query));
}

export async function postLotMarkExpired(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de lote inválido.', 400, null, 'LOT_ID_INVALID');
  res.json(await markLotAsExpired(id, req.body));
}

export async function postLotWaste(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de lote inválido.', 400, null, 'LOT_ID_INVALID');
  res.json(await registerLotWaste(id, req.body));
}

export async function postLotPromotion(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de lote inválido.', 400, null, 'LOT_ID_INVALID');
  res.json(await promoteLot(id, req.body));
}
