import fingerprints from './sample-fingerprints.json';
import type { DocumentPage, Extraction, Field } from './document-schema';

export const sampleFiles = {
  invoice: 'invoice.pdf', corrected: 'invoice-corrected.pdf', decaf: 'invoice-decaf.pdf',
  agreement: 'agreement.pdf', overlap: 'agreement-overlap.pdf',
} as const;


export async function isBundledSample(file: Blob, names: (keyof typeof fingerprints)[]) {
  if (!globalThis.crypto?.subtle) return false;
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return names.some(name => fingerprints[name] === hex);
}
function lines(pages: DocumentPage[]) {
  return pages.flatMap(({ page, text }) => text.split('\n').map(quote => ({ page, quote: quote.trim() })));
}

function field(row: { page: number; quote: string }, label: string): Field {
  const part = row.quote.split('|').find(part => part.trim().startsWith(label + ': '));
  const value = part?.trim().slice(label.length + 2);
  return value ? { ...row, value } : null;
}

export function extractSample(invoicePages: DocumentPage[], agreementPages: DocumentPage[]): Extraction {
  const invoice = lines(invoicePages);
  const agreement = lines(agreementPages);
  const first = (rows: ReturnType<typeof lines>, name: string) => rows.map(row => field(row, name)).find(Boolean) ?? null;
  return {
    invoice: {
      supplier: first(invoice, 'Supplier'), number: first(invoice, 'Invoice number'),
      date: first(invoice, 'Invoice date'), currency: first(invoice, 'Currency'),
      lines: invoice.filter(row => row.quote.startsWith('Item: ')).map(row => ({
        item: field(row, 'Item'), description: field(row, 'Description'),
        quantity: field(row, 'Quantity'), price: field(row, 'Unit price'),
      })),
    },
    agreement: {
      supplier: first(agreement, 'Supplier'), currency: first(agreement, 'Currency'),
      rates: agreement.filter(row => row.quote.startsWith('Item: ')).map(row => ({
        item: field(row, 'Item'), price: field(row, 'Unit price'), from: field(row, 'From'), to: field(row, 'To'),
      })),
    },
  };
}
