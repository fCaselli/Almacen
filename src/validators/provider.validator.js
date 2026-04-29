import { AppError } from '../errors/AppError.js';
import { isValidEmail, normalizeKey, normalizeText, now } from '../utils/common.js';

export function validateProviderInput(body = {}) {
  const name = normalizeText(body.name);
  const contactName = normalizeText(body.contactName);
  const phone = normalizeText(body.phone);
  const email = normalizeText(body.email);
  const notes = normalizeText(body.notes);

  if (!name || name.length < 2) throw new AppError('El nombre del proveedor es obligatorio y debe tener al menos 2 caracteres.', 400, null, 'PROVIDER_NAME_INVALID');
  if (name.length > 120) throw new AppError('El nombre del proveedor es demasiado largo.', 400, null, 'PROVIDER_NAME_TOO_LONG');
  if (!isValidEmail(email)) throw new AppError('El email del proveedor no tiene un formato válido.', 400, null, 'PROVIDER_EMAIL_INVALID');
  if (phone && phone.length > 40) throw new AppError('El teléfono del proveedor es demasiado largo.', 400, null, 'PROVIDER_PHONE_TOO_LONG');

  return {
    name,
    normalizedName: normalizeKey(name),
    contactName,
    phone,
    email,
    notes,
    updatedAt: now(),
  };
}
