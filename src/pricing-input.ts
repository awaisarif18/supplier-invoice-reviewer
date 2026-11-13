export const maxQuantity = 1_000_000;
export const maxPrice = 1_000_000;
export const pricePattern = '[0-9]{1,7}(\\.[0-9]{1,2})?';

export function readPrice(value: string) {
  if (!new RegExp(`^${pricePattern}$`).test(value) || Number(value) > maxPrice) return null;
  const [whole, decimal = ''] = value.split('.');
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
}
