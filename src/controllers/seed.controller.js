import { seedDemoData } from '../services/seed.service.js';

export async function resetDemo(_req, res) {
  const seeded = await seedDemoData();
  res.json({ ok: true, message: 'Datos demo restaurados correctamente.', seeded });
}
