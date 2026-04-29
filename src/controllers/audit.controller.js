import { listAuditLogs } from '../services/audit.service.js';

export async function getAuditLogs(req, res) {
  res.json(await listAuditLogs(req.query));
}
