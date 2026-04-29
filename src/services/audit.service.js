import { auditLogsRepository } from '../repositories/audit-logs.repository.js';
import { buildContainsRegex, cleanObject, normalizeText, now } from '../utils/common.js';
import { parsePagination, parseSort, buildPaginationMeta } from '../utils/pagination.js';
import { serializeAuditLog } from '../utils/serialize.js';

const AUDIT_SORTS = {
  createdAt: 'createdAt',
  action: 'action',
  entityType: 'entityType',
  actor: 'actor',
};

export async function logAudit({ action, entityType, entityId = null, message, actor = 'sistema', metadata = null }) {
  if (!action || !entityType) return null;

  const doc = {
    action,
    entityType,
    entityId: entityId ? String(entityId) : null,
    actor: normalizeText(actor || 'sistema'),
    message: normalizeText(message || action),
    metadata,
    createdAt: now(),
  };

  try {
    const result = await auditLogsRepository.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  } catch (error) {
    console.warn('⚠️ No se pudo guardar el log de auditoría:', error?.message || error);
    return null;
  }
}

function buildAuditFilter(query = {}) {
  const q = buildContainsRegex(query.q);
  const action = normalizeText(query.action);
  const entityType = normalizeText(query.entityType);
  const actor = normalizeText(query.actor);

  const filter = cleanObject({
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(actor ? { actor } : {}),
  });

  if (q) {
    filter.$or = [
      { action: q },
      { entityType: q },
      { actor: q },
      { message: q },
      { entityId: q },
    ];
  }

  return filter;
}

export async function listAuditLogs(query = {}) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 30, maxLimit: 100 });
  const { sort, order } = parseSort(query, {
    defaultSort: 'createdAt',
    defaultOrder: 'desc',
    allowedSorts: Object.keys(AUDIT_SORTS),
  });

  const filter = buildAuditFilter(query);
  const mongoSort = { [AUDIT_SORTS[sort] || 'createdAt']: order === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    auditLogsRepository.findPaged(filter, { sort: mongoSort, skip, limit }),
    auditLogsRepository.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeAuditLog),
    meta: buildPaginationMeta({ total, page, limit, sort, order }),
  };
}
