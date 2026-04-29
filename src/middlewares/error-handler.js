import { AppError } from '../errors/AppError.js';

export function errorHandler(err, _req, res, _next) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Error interno del servidor.';

  if (!(err instanceof AppError)) {
    console.error('❌ Error no controlado:', err);
  }

  res.status(statusCode).json({
    ok: false,
    message,
    details: err instanceof AppError ? err.details : null,
  });
}
