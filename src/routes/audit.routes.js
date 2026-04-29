import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getAuditLogs } from '../controllers/audit.controller.js';

export const auditRouter = Router();
auditRouter.get('/', asyncHandler(getAuditLogs));
