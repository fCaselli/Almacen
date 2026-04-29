import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getAlerts, postReopenAlert, postResolveAlert } from '../controllers/alerts.controller.js';

export const alertsRouter = Router();
alertsRouter.get('/', asyncHandler(getAlerts));
alertsRouter.post('/:key/resolve', asyncHandler(postResolveAlert));
alertsRouter.post('/:key/reopen', asyncHandler(postReopenAlert));
