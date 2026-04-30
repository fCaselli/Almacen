import { objectIdOrNull } from '../utils/common.js';
import { AppError } from '../errors/AppError.js';
import { createProvider, deleteProvider, listProviders, updateProvider } from '../services/providers.service.js';

export async function getProviders(_req, res) {
  res.json(await listProviders());
}

export async function postProvider(req, res) {
  const item = await createProvider(req.body);
  res.status(201).json({ ok: true, message: 'Proveedor creado correctamente.', item });
}

export async function putProvider(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de proveedor inválido.', 400, null, 'PROVIDER_ID_INVALID');
  const item = await updateProvider(id, req.body);
  res.json({ ok: true, message: 'Proveedor actualizado correctamente.', item });
}

export async function removeProvider(req, res) {
  const id = objectIdOrNull(req.params.id);
  if (!id) throw new AppError('ID de proveedor inválido.', 400, null, 'PROVIDER_ID_INVALID');
  res.json(await deleteProvider(id, req.body));
}
