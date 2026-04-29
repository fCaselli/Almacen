import { getAlertsData, reopenAlert, resolveAlert } from '../services/alerts.service.js';

export async function getAlerts(req, res) {
  res.json(await getAlertsData(req.query));
}

export async function postResolveAlert(req, res) {
  res.json(await resolveAlert(req.params.key, req.body));
}

export async function postReopenAlert(req, res) {
  res.json(await reopenAlert(req.params.key, req.body));
}
