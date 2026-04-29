export function productStatus(product) {
  const stock = Number(product?.stock || 0);
  const minStock = Number(product?.minStock || 0);
  if (stock <= 0) return 'Sin stock';
  if (stock < minStock) return 'Bajo mínimo';
  if (stock === minStock) return 'En límite';
  return 'OK';
}

export function calculateDaysLeft(dateValue) {
  if (!dateValue) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateValue);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function lotStatus(lot) {
  if ((lot?.remainingQuantity || 0) <= 0) return 'Agotado';
  const daysLeft = calculateDaysLeft(lot?.expiry);
  if (daysLeft === null) return 'Sin vencimiento';
  if (daysLeft < 0) return 'Vencido';
  if (daysLeft <= 7) return 'Urgente';
  if (daysLeft <= 30) return 'Por vencer';
  return 'OK';
}
