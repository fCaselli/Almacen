import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductInput } from '../src/validators/product.validator.js';
import { AppError } from '../src/errors/AppError.js';

test('validateProductInput normaliza datos válidos', () => {
  const result = validateProductInput({
    name: '  Yerba Mate Suave  ',
    category: ' Almacén ',
    supplierName: ' Don José ',
    location: ' Góndola 2 ',
    barcode: ' 779123 ',
    price: '2500.50',
    stock: 12,
    minStock: 4,
  });

  assert.equal(result.name, 'Yerba Mate Suave');
  assert.equal(result.normalizedName, 'yerba mate suave');
  assert.equal(result.category, 'Almacén');
  assert.equal(result.supplierName, 'Don José');
  assert.equal(result.location, 'Góndola 2');
  assert.equal(result.barcode, '779123');
  assert.equal(result.price, 2500.5);
  assert.equal(result.stock, 12);
  assert.equal(result.minStock, 4);
  assert.ok(result.updatedAt instanceof Date);
});

test('validateProductInput rechaza stock negativo', () => {
  assert.throws(
    () => validateProductInput({ name: 'Arroz', category: 'Almacén', price: 1000, stock: -1, minStock: 0 }),
    (error) => error instanceof AppError && error.code === 'PRODUCT_STOCK_INVALID'
  );
});

test('validateProductInput rechaza nombre demasiado corto', () => {
  assert.throws(
    () => validateProductInput({ name: 'A', category: 'Almacén', price: 1000, stock: 1, minStock: 0 }),
    (error) => error instanceof AppError && error.code === 'PRODUCT_NAME_INVALID'
  );
});
