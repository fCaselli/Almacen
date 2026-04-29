import { Router } from 'express';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getHealth } from '../controllers/health.controller.js';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { resetDemo } from '../controllers/seed.controller.js';
import { productsRouter } from './products.routes.js';
import { providersRouter } from './providers.routes.js';
import { purchasesRouter } from './purchases.routes.js';
import { lotsRouter } from './lots.routes.js';
import { alertsRouter } from './alerts.routes.js';
import { auditRouter } from './audit.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', asyncHandler(getHealth));
apiRouter.get('/dashboard', asyncHandler(getDashboard));
apiRouter.post('/reset-demo', asyncHandler(resetDemo));

apiRouter.use('/products', productsRouter);
apiRouter.use('/providers', providersRouter);
apiRouter.use('/purchases', purchasesRouter);
apiRouter.use('/lots', lotsRouter);
apiRouter.use('/alerts', alertsRouter);
apiRouter.use('/audit-logs', auditRouter);
