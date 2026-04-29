import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProviderInput } from '../src/validators/provider.validator.js';
import { AppError } from '../src/errors/AppError.js';

test('validateProviderInput genera normalizedName y limpia textos', () => {
  const result = validateProviderInput({
    name: '  Distribuidora Ñandú  ',
    contactName: '  Marta  ',
    phone: ' 123456 ',
    email: ' ventas@nandu.com ',
    notes: '  entrega semanal ',
  });

  assert.equal(result.name, 'Distribuidora Ñandú');
  assert.equal(result.normalizedName, 'distribuidora nandu');
  assert.equal(result.contactName, 'Marta');
  assert.equal(result.phone, '123456');
  assert.equal(result.email, 'ventas@nandu.com');
  assert.equal(result.notes, 'entrega semanal');
  assert.ok(result.updatedAt instanceof Date);
});

test('validateProviderInput rechaza email inválido', () => {
  assert.throws(
    () => validateProviderInput({ name: 'Proveedor Test', email: 'mail-invalido' }),
    (error) => error instanceof AppError && error.code === 'PROVIDER_EMAIL_INVALID'
  );
});
