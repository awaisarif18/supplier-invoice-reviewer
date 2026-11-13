import { verifiedField, type DocumentPage, type Field } from './document-schema';
import { maxQuantity, readPrice } from './pricing-input';
import type { Invoice, Rate } from './types';

export type Editable = { value: string; original: Field };
export type UploadDocument = { file: Blob; name: string; pages: DocumentPage[] };
export type ReviewInput = { invoice: Invoice; rates: Rate[]; reason?: string };

export function prepareFields<T extends Record<string, Field>>(fields: T, pages: DocumentPage[]) {
  return Object.fromEntries(Object.entries(fields).map(([key, field]) => {
    const original = verifiedField(field, pages);
    return [key, { value: original?.value ?? '', original }];
  })) as Record<keyof T, Editable>;
}

const identifier = (value: string) => value.normalize('NFKC').trim().toUpperCase().replace(/\s+/g, ' ');
function isDate(value: string) {
  const time = Date.parse(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function confirmedInputs(form: FormData, line: number, rows: Record<string, Editable>[], names: { invoice: string; agreement: string }): ReviewInput {
  const get = (key: string) => String(form.get(key) ?? '').trim();
  const supplier = get('supplier'), item = get('item'), invoiceDate = get('date');
  const chargedCents = readPrice(get('price'));
  const quantity = Number(get('quantity'));
  if (!supplier || !item || !get('number') || !isDate(invoiceDate) || chargedCents === null ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
    throw new Error('Confirm the supplier, invoice number, date, item, quantity, and billed price.');
  }
  if (identifier(get('currency')) !== 'USD') throw new Error('Confirm the invoice currency. This price check supports USD.');
  const poCents = get('po') ? readPrice(get('po')) : null;
  if (get('po') && poCents === null) throw new Error('Enter a valid purchase order price or leave it blank.');

  const invoice: Invoice = {
    invoiceId: get('number'), line, supplier, supplierId: identifier(supplier), item: identifier(item),
    description: get('description') || item, invoiceDate, quantity, chargedCents, poCents,
    poId: poCents === null ? null : 'Entered purchase order',
  };

  const agreementSupplier = identifier(get('agreement-supplier'));
  const agreementCurrency = identifier(get('agreement-currency'));
  const rates: Rate[] = [];
  if (!agreementSupplier || agreementCurrency !== 'USD') {
    return { invoice, rates, reason: 'Confirm the supplier name and USD currency on the agreement before comparing prices.' };
  }
  for (const [i, row] of rows.entries()) {
    if (['item', 'price', 'from', 'to'].every(key => !get(key + '-' + i) && !row[key].original)) continue;
    const item = identifier(get('item-' + i));
    if (item && item !== invoice.item) continue;
    const unitCents = readPrice(get('price-' + i));
    const from = get('from-' + i), end = get('to-' + i);
    if (!item || unitCents === null || !isDate(from) || !end || (end !== 'Open' && (!isDate(end) || end <= from))) {
      return { invoice, rates: [], reason: 'A possible agreement rate is incomplete. Confirm its item, price, and effective period before comparing.' };
    }
    const unchanged = (['item', 'price', 'from', 'to'] as const).every(key => get(key + '-' + i) === row[key].original?.value);
    const evidence = unchanged ? row.price.original : null;
    rates.push({ supplierId: agreementSupplier, item, unitCents, effectiveFrom: from,
      effectiveTo: end === 'Open' ? null : end, source: evidence ? names.agreement + ' · Page ' + evidence.page : 'Manually confirmed rate',
      document: 'Supplier agreement', clause: evidence?.quote || 'The reviewer entered or corrected this rate.',
    });
  }
  return { invoice, rates };
}
