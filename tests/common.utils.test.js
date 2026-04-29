import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKey, asCurrencyNumber, parseDateOrNull, buildContainsRegex } from '../src/utils/common.js';

test('normalizeKey remueve acentos y normaliza espacios', () => {
  assert.equal(normalizeKey('  Proveedór   Ñandú  '), 'proveedor nandu');
});

test('asCurrencyNumber redondea a dos decimales', () => {
  assert.equal(asCurrencyNumber('10.129'), 10.13);
});

test('parseDateOrNull devuelve null para fechas inválidas', () => {
  assert.equal(parseDateOrNull('fecha-mala'), null);
});

test('buildContainsRegex genera regex case-insensitive', () => {
  const regex = buildContainsRegex('Arroz');
  assert.ok(regex.test('arroz largo fino'));
});
