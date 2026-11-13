import { z } from 'zod';

const field = z.object({ value: z.string(), page: z.number().int(), quote: z.string() }).nullable();
export const extractionSchema = z.object({
  invoice: z.object({ supplier: field, number: field, date: field, currency: field,
    lines: z.array(z.object({ item: field, description: field, quantity: field, price: field })) }),
  agreement: z.object({ supplier: field, currency: field,
    rates: z.array(z.object({ item: field, price: field, from: field, to: field })) }),
});

const pageSchema = z.array(z.object({
  page: z.number().int().min(1).max(12), text: z.string().min(1).max(18000),
})).min(1).max(12).refine(pages => pages.reduce((sum, page) => sum + page.text.length, 0) <= 18000);
export const requestSchema = z.object({ invoice: pageSchema, agreement: pageSchema });

export type Field = z.infer<typeof field>;
export type DocumentPage = z.infer<typeof pageSchema>[number];
export type Extraction = z.infer<typeof extractionSchema>;

export function normalizeText(value: string) {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function verifiedField(field: Field, pages: DocumentPage[]): Field {
  if (!field?.value.trim() || !field.quote.trim()) return null;
  const page = pages.find(page => page.page === field.page);
  if (!page || !normalizeText(page.text).includes(normalizeText(field.quote))) return null;
  return field;
}
