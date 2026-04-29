import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getProviders, postProvider, putProvider, removeProvider } from '../controllers/providers.controller.js';

export const providersRouter = Router();
providersRouter.get('/', asyncHandler(getProviders));
providersRouter.post('/', asyncHandler(postProvider));
providersRouter.put('/:id', asyncHandler(putProvider));
providersRouter.delete('/:id', asyncHandler(removeProvider));
