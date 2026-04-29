import test from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../src/middlewares/error-handler.js';
import { AppError } from '../src/errors/AppError.js';

function createResponseMock() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('errorHandler responde errores operativos con status y mensaje', () => {
  const res = createResponseMock();
  const error = new AppError('Producto inválido.', 400, { field: 'name' }, 'PRODUCT_INVALID');

  errorHandler(error, {}, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    ok: false,
    message: 'Producto inválido.',
    details: { field: 'name' },
  });
});

test('errorHandler oculta detalles en errores no controlados', () => {
  const res = createResponseMock();

  errorHandler(new Error('boom'), {}, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    ok: false,
    message: 'Error interno del servidor.',
    details: null,
  });
});
