import { env } from '../config/env.js';
import { getDashboardData } from '../services/dashboard.service.js';

export async function getHealth(_req, res) {
  const stats = await getDashboardData();
  res.json({
    ok: true,
    database: 'mongodb',
    dbName: env.DB_NAME,
    cards: stats.cards,
    timestamp: new Date().toISOString(),
  });
}
