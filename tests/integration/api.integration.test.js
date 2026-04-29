import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017';
process.env.DB_NAME = `almacen_integration_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const { createApp } = await import('../../src/app.js');
const { connectToDatabase, closeDatabase, getDb } = await import('../../src/config/db.js');
const { ensureIndexes } = await import('../../src/config/indexes.js');

let server;
let baseUrl;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

before(async () => {
  await connectToDatabase();
  await ensureIndexes();
  const app = createApp();
  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
  await getDb().dropDatabase();
  await closeDatabase();
});

test('flujo de productos y proveedores por HTTP', async () => {
  const providerName = `Proveedor Test ${randomUUID().slice(0, 8)}`;
  const { response: providerResponse, body: providerBody } = await request('/api/providers', {
    method: 'POST',
    body: JSON.stringify({
      name: providerName,
      email: 'proveedor@test.com',
      phone: '123456',
    }),
  });

  assert.equal(providerResponse.status, 201);
  assert.equal(providerBody.ok, true);
  assert.equal(providerBody.item.name, providerName);

  const productName = `Producto Test ${randomUUID().slice(0, 8)}`;
  const { response: productResponse, body: productBody } = await request('/api/products', {
    method: 'POST',
    body: JSON.stringify({
      name: productName,
      category: 'Almacén',
      supplierName: providerName,
      price: 1500,
      stock: 2,
      minStock: 5,
      location: 'Góndola 1',
    }),
  });

  assert.equal(productResponse.status, 201);
  assert.equal(productBody.ok, true);
  assert.equal(productBody.item.name, productName);

  const { response: listResponse, body: listBody } = await request(`/api/products?q=${encodeURIComponent(productName)}`);
  assert.equal(listResponse.status, 200);
  assert.equal(listBody.items.length, 1);
  assert.equal(listBody.items[0].status, 'Bajo mínimo');
});

test('compra pendiente se puede recibir y aplicar inventario', async () => {
  const providerName = `Proveedor Pending ${randomUUID().slice(0, 8)}`;
  const provider = await request('/api/providers', {
    method: 'POST',
    body: JSON.stringify({ name: providerName, email: 'pending@test.com' }),
  });
  const providerId = provider.body.item.id;

  const productName = `Yerba ${randomUUID().slice(0, 8)}`;
  const product = await request('/api/products', {
    method: 'POST',
    body: JSON.stringify({
      name: productName,
      category: 'Almacén',
      supplierName: providerName,
      price: 2100,
      stock: 1,
      minStock: 2,
      location: 'Góndola 2',
    }),
  });
  const productId = product.body.item.id;

  const expiry = new Date(Date.now() + 10 * 86400000).toISOString();
  const purchase = await request('/api/purchases', {
    method: 'POST',
    body: JSON.stringify({
      providerId,
      reference: `PEND-${Date.now()}`,
      status: 'pending',
      responsible: 'test-suite',
      lines: [
        { productId, quantity: 4, unitCost: 1000, expiry },
      ],
    }),
  });

  assert.equal(purchase.response.status, 201);
  assert.equal(purchase.body.item.status, 'pending');
  assert.equal(purchase.body.item.inventoryStatus, 'pending');

  const db = getDb();
  let productDoc = await db.collection('products').findOne({ normalizedName: productName.toLowerCase() });
  assert.equal(productDoc.stock, 1);
  assert.equal(await db.collection('lots').countDocuments({ productName }), 0);

  const receive = await request(`/api/purchases/${purchase.body.item.id}/receive`, {
    method: 'POST',
    body: JSON.stringify({ responsible: 'test-suite', notes: 'Recepción completa' }),
  });

  assert.equal(receive.response.status, 200);
  assert.equal(receive.body.ok, true);
  assert.equal(receive.body.item.status, 'received');
  assert.equal(receive.body.item.inventoryStatus, 'applied');

  productDoc = await db.collection('products').findOne({ normalizedName: productName.toLowerCase() });
  assert.equal(productDoc.stock, 5);
  assert.equal(await db.collection('lots').countDocuments({ productName }), 1);

  const alerts = await request('/api/alerts');
  assert.equal(alerts.response.status, 200);
  const expiringAlert = alerts.body.feed.find((item) => item.type === 'lot-expiring' && item.refText);
  assert.ok(expiringAlert);

  const resolve = await request(`/api/alerts/${encodeURIComponent(expiringAlert.key)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolvedBy: 'test-suite', resolutionType: 'reviewed' }),
  });
  assert.equal(resolve.response.status, 200);
  assert.equal(resolve.body.ok, true);

  const reopen = await request(`/api/alerts/${encodeURIComponent(expiringAlert.key)}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ responsible: 'test-suite' }),
  });
  assert.equal(reopen.response.status, 200);
  assert.equal(reopen.body.ok, true);
});

test('compra pendiente se puede cancelar sin tocar inventario', async () => {
  const providerName = `Proveedor Cancel ${randomUUID().slice(0, 8)}`;
  const provider = await request('/api/providers', {
    method: 'POST',
    body: JSON.stringify({ name: providerName, email: 'cancel@test.com' }),
  });
  const providerId = provider.body.item.id;

  const productName = `Fideos ${randomUUID().slice(0, 8)}`;
  const product = await request('/api/products', {
    method: 'POST',
    body: JSON.stringify({
      name: productName,
      category: 'Almacén',
      supplierName: providerName,
      price: 1200,
      stock: 3,
      minStock: 2,
      location: 'Góndola 3',
    }),
  });
  const productId = product.body.item.id;

  const purchase = await request('/api/purchases', {
    method: 'POST',
    body: JSON.stringify({
      providerId,
      reference: `CANC-${Date.now()}`,
      status: 'pending',
      responsible: 'test-suite',
      lines: [{ productId, quantity: 6, unitCost: 800 }],
    }),
  });

  const cancel = await request(`/api/purchases/${purchase.body.item.id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ responsible: 'test-suite', reason: 'Proveedor demoró entrega' }),
  });

  assert.equal(cancel.response.status, 200);
  assert.equal(cancel.body.ok, true);
  assert.equal(cancel.body.item.status, 'canceled');
  assert.equal(cancel.body.item.inventoryStatus, 'canceled');

  const db = getDb();
  const productDoc = await db.collection('products').findOne({ normalizedName: productName.toLowerCase() });
  assert.equal(productDoc.stock, 3);
  assert.equal(await db.collection('lots').countDocuments({ productName }), 0);
});
