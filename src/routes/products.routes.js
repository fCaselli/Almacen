import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getProducts, postProduct, postReorderSuggestion, putProduct, removeProduct } from '../controllers/products.controller.js';

export const productsRouter = Router();
productsRouter.get('/', asyncHandler(getProducts));
productsRouter.post('/', asyncHandler(postProduct));
productsRouter.post('/:id/reorder-suggestion', asyncHandler(postReorderSuggestion));
productsRouter.put('/:id', asyncHandler(putProduct));
productsRouter.delete('/:id', asyncHandler(removeProduct));
