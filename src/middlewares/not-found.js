export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    ok: false,
    code: 'ROUTE_NOT_FOUND',
    message: 'Ruta no encontrada.',
    details: { method: req.method, path: req.originalUrl },
  });
}
