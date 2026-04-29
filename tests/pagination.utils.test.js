import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePagination, parseSort, buildPaginationMeta } from '../src/utils/pagination.js';

test('parsePagination limita el tamaño máximo y calcula skip', () => {
  const parsed = parsePagination({ page: '3', limit: '500' }, { defaultLimit: 10, maxLimit: 50 });
  assert.equal(parsed.page, 3);
  assert.equal(parsed.limit, 50);
  assert.equal(parsed.skip, 100);
});

test('parseSort valida columnas y orden', () => {
  const parsed = parseSort(
    { sort: 'price', order: 'asc' },
    { defaultSort: 'name', allowedSorts: ['name', 'price'] },
  );

  assert.equal(parsed.sort, 'price');
  assert.equal(parsed.order, 'asc');
});

test('buildPaginationMeta arma metadata consistente', () => {
  const meta = buildPaginationMeta({ total: 23, page: 2, limit: 10, sort: 'name', order: 'asc' });
  assert.deepEqual(meta, {
    total: 23,
    page: 2,
    limit: 10,
    totalPages: 3,
    hasPrevPage: true,
    hasNextPage: true,
    sort: 'name',
    order: 'asc',
  });
});
