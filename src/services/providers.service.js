import { AppError } from '../errors/AppError.js';
import { productsRepository } from '../repositories/products.repository.js';
import { providersRepository } from '../repositories/providers.repository.js';
import { purchasesRepository } from '../repositories/purchases.repository.js';
import { buildContainsRegex, cleanObject, now, normalizeText } from '../utils/common.js';
import { buildPaginationMeta, parsePagination, parseSort } from '../utils/pagination.js';
import { serializeProvider } from '../utils/serialize.js';
import { validateProviderInput } from '../validators/provider.validator.js';
import { logAudit } from './audit.service.js';

const PROVIDER_SORTS = {
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

function buildProvidersFilter(query = {}) {
  const q = buildContainsRegex(query.q);
  const filter = {};

  if (q) {
    filter.$or = [
      { name: q },
      { contactName: q },
      { phone: q },
      { email: q },
      { notes: q },
    ];
  }

  return filter;
}

export async function listProviders(query = {}) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 12, maxLimit: 100 });
  const { sort, order } = parseSort(query, {
    defaultSort: 'name',
    defaultOrder: 'asc',
    allowedSorts: Object.keys(PROVIDER_SORTS),
  });

  const filter = buildProvidersFilter(query);
  const mongoSort = { [PROVIDER_SORTS[sort] || 'name']: order === 'asc' ? 1 : -1 };

  const [docs, total] = await Promise.all([
    providersRepository.findPaged(filter, { sort: mongoSort, skip, limit }),
    providersRepository.countDocuments(filter),
  ]);

  const items = await Promise.all(docs.map(async (provider) => {
    const [purchaseCount, productCount] = await Promise.all([
      purchasesRepository.countDocuments({ providerId: provider._id }),
      productsRepository.countDocuments({ supplierId: provider._id }),
    ]);
    return serializeProvider(provider, { purchaseCount, productCount });
  }));

  return {
    items,
    meta: buildPaginationMeta({ total, page, limit, sort, order }),
  };
}

export async function createProvider(body) {
  const payload = validateProviderInput(body);
  const existing = await providersRepository.findByNormalizedName(payload.normalizedName);
  if (existing) throw new AppError('Ya existe un proveedor con ese nombre.', 409, null, 'PROVIDER_DUPLICATE');

  const doc = { ...payload, createdAt: now() };
  const result = await providersRepository.insertOne(doc);
  const created = await providersRepository.findById(result.insertedId);

  await logAudit({
    action: 'provider.create',
    entityType: 'provider',
    entityId: result.insertedId,
    actor: body.responsible || 'sistema',
    message: `Se creó el proveedor ${payload.name}.`,
  });

  return serializeProvider(created, { purchaseCount: 0, productCount: 0 });
}

export async function updateProvider(id, body) {
  const payload = validateProviderInput(body);
  const duplicate = await providersRepository.findDuplicateNormalizedName(payload.normalizedName, id);
  if (duplicate) throw new AppError('Ya existe otro proveedor con ese nombre.', 409, null, 'PROVIDER_DUPLICATE');

  const before = await providersRepository.findById(id);
  if (!before) throw new AppError('Proveedor no encontrado.', 404, null, 'PROVIDER_NOT_FOUND');

  const updated = await providersRepository.updateById(id, { $set: payload }, { returnDocument: 'after' });

  await logAudit({
    action: 'provider.update',
    entityType: 'provider',
    entityId: id,
    actor: body.responsible || 'sistema',
    message: `Se actualizó el proveedor ${updated.name}.`,
    metadata: {
      before: { name: before.name, email: before.email, phone: before.phone },
      after: { name: updated.name, email: updated.email, phone: updated.phone },
    },
  });

  return serializeProvider(updated);
}

export async function deleteProvider(id, body = {}) {
  const existing = await providersRepository.findById(id);
  if (!existing) throw new AppError('Proveedor no encontrado.', 404, null, 'PROVIDER_NOT_FOUND');

  const [purchaseCount, productCount] = await Promise.all([
    purchasesRepository.countDocuments({ providerId: id }),
    productsRepository.countDocuments({ supplierId: id }),
  ]);

  if (purchaseCount || productCount) {
    throw new AppError('No podés borrar este proveedor porque tiene productos o compras asociadas.', 400, null, 'PROVIDER_IN_USE');
  }

  const result = await providersRepository.deleteById(id);
  if (!result.deletedCount) throw new AppError('Proveedor no encontrado.', 404, null, 'PROVIDER_NOT_FOUND');

  await logAudit({
    action: 'provider.delete',
    entityType: 'provider',
    entityId: id,
    actor: body.responsible || 'sistema',
    message: `Se eliminó el proveedor ${existing.name}.`,
  });

  return { ok: true, message: 'Proveedor eliminado.' };
}
