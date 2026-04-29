import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { validatePurchaseInput } from '../src/validators/purchase.validator.js';
import { providersRepository } from '../src/repositories/providers.repository.js';
import { productsRepository } from '../src/repositories/products.repository.js';
import { AppError } from '../src/errors/AppError.js';

const originalFindById = providersRepository.findById;
const originalCollection = productsRepository.collection;

function mockProvider(id, name = 'Proveedor Test') {
  providersRepository.findById = async (providerId) => String(providerId) === String(id) ? { _id: id, name } : null;
}

function mockProducts(products) {
  productsRepository.collection = () => ({
    find() {
      return {
        async toArray() {
          return products;
        },
      };
    },
  });
}

test.afterEach(() => {
  providersRepository.findById = originalFindById;
  productsRepository.collection = originalCollection;
});

test('validatePurchaseInput arma una compra válida', async () => {
  const providerId = new ObjectId();
  const productId = new ObjectId();
  mockProvider(providerId, 'Mayorista Sur');
  mockProducts([{ _id: productId, name: 'Aceite 900ml' }]);

  const result = await validatePurchaseInput({
    providerId: String(providerId),
    reference: ' comp-001 ',
    paidAmount: 4000,
    purchasedAt: '2026-01-10',
    lines: [
      {
        productId: String(productId),
        quantity: 4,
        unitCost: 1000,
        expiry: '2026-03-10',
      },
    ],
  });

  assert.equal(result.provider.name, 'Mayorista Sur');
  assert.equal(result.purchase.reference, 'COMP-001');
  assert.equal(result.purchase.total, 4000);
  assert.equal(result.purchase.balance, 0);
  assert.equal(result.purchase.lines.length, 1);
  assert.equal(result.purchase.lines[0].productName, 'Aceite 900ml');
});

test('validatePurchaseInput rechaza líneas repetidas', async () => {
  const providerId = new ObjectId();
  const productId = new ObjectId();
  mockProvider(providerId);
  mockProducts([{ _id: productId, name: 'Harina 000' }]);

  await assert.rejects(
    () => validatePurchaseInput({
      providerId: String(providerId),
      reference: 'COMP-002',
      lines: [
        { productId: String(productId), quantity: 2, unitCost: 900 },
        { productId: String(productId), quantity: 1, unitCost: 950 },
      ],
    }),
    (error) => error instanceof AppError && error.code === 'PURCHASE_DUPLICATE_PRODUCT'
  );
});

test('validatePurchaseInput rechaza pago mayor al total', async () => {
  const providerId = new ObjectId();
  const productId = new ObjectId();
  mockProvider(providerId);
  mockProducts([{ _id: productId, name: 'Fideos' }]);

  await assert.rejects(
    () => validatePurchaseInput({
      providerId: String(providerId),
      reference: 'COMP-003',
      paidAmount: 9999,
      lines: [
        { productId: String(productId), quantity: 1, unitCost: 1000 },
      ],
    }),
    (error) => error instanceof AppError && error.code === 'PURCHASE_PAID_AMOUNT_EXCEEDS_TOTAL'
  );
});
