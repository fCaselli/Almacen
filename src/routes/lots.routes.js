import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getLots, postLotMarkExpired, postLotPromotion, postLotWaste } from '../controllers/lots.controller.js';

export const lotsRouter = Router();
lotsRouter.get('/', asyncHandler(getLots));
lotsRouter.post('/:id/mark-expired', asyncHandler(postLotMarkExpired));
lotsRouter.post('/:id/waste', asyncHandler(postLotWaste));
lotsRouter.post('/:id/promotion', asyncHandler(postLotPromotion));
