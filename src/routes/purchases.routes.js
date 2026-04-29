import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getPurchase, getPurchases, postCancelPurchase, postPurchase, postReceivePurchase } from '../controllers/purchases.controller.js';

export const purchasesRouter = Router();
purchasesRouter.get('/', asyncHandler(getPurchases));
purchasesRouter.get('/:id', asyncHandler(getPurchase));
purchasesRouter.post('/', asyncHandler(postPurchase));

purchasesRouter.post('/:id/receive', asyncHandler(postReceivePurchase));
purchasesRouter.post('/:id/cancel', asyncHandler(postCancelPurchase));
