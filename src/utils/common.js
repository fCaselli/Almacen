import { ObjectId } from 'mongodb';

export function now() {
  return new Date();
}

export function asCurrencyNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

export function normalizeText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function normalizeKey(value, fallback = '') {
  return normalizeText(value, fallback)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\$&');
}

export function buildContainsRegex(value) {
  const normalized = normalizeText(value);
  return normalized ? new RegExp(escapeRegex(normalized), 'i') : null;
}

export function objectIdOrNull(value) {
  if (!value || !ObjectId.isValid(value)) return null;
  return new ObjectId(String(value));
}

export function parseDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function sortByLocale(a, b, key) {
  return String(a?.[key] || '').localeCompare(String(b?.[key] || ''), 'es');
}

export function isValidEmail(value) {
  const email = normalizeText(value);
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ensureNonNegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(`${label} debe ser un entero mayor o igual a cero.`);
  }
  return parsed;
}

export function cleanObject(obj = {}) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}
