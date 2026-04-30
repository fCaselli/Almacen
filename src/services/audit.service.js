import { auditLogsRepository } from '../repositories/audit-logs.repository.js';
import { normalizeText, now } from '../utils/common.js';
import { serializeAuditLog } from '../utils/serialize.js';

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
  const result = await auditLogsRepository.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function listAuditLogs(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit || 30), 1), 100);
  const docs = await auditLogsRepository.findPaged({}, { limit });
  return {
    items: docs.map(serializeAuditLog),
    meta: {
      total: await auditLogsRepository.countDocuments(),
      limit,
    },
  };
}
