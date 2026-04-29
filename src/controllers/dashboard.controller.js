import { getDashboardData } from '../services/dashboard.service.js';

export async function getDashboard(_req, res) {
  const data = await getDashboardData();
  res.json(data);
}
