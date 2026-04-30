import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use('/public', express.static(publicDir));

  app.use('/api', apiRouter);
  app.get('/', (_req, res) => {
    res.sendFile(join(rootDir, 'index.html'));
  });
  app.use(notFoundHandler);
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(join(rootDir, 'index.html'));
  });
  app.use(errorHandler);

  return app;
}
