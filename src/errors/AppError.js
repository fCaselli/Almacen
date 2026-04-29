export class AppError extends Error {
  constructor(message, statusCode = 400, details = null, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.isOperational = true;
  }
}
