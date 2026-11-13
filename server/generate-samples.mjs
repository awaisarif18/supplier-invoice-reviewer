import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const path = new URL('../public/samples/', import.meta.url);
mkdirSync(path, { recursive: true });
const fingerprints = {};

function pdf(filename, pages) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count ' + pages.length + ' /Kids [' + pages.map((_, i) => (4 + i * 2) + ' 0 R').join(' ') + '] >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  for (const lines of pages) {
    const stream = lines.map((line, i) => 'BT /F1 ' + (i === 0 ? 20 : line.length > 83 ? 9 : 12) + ' Tf 58 ' + (740 - i * 27) + ' Td (' + line + ') Tj ET').join('\n');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + (objects.length + 2) + ' 0 R >>',
      '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
  }
  let file = '%PDF-1.4\n';
  const offsets = objects.map((object, i) => {
    const offset = file.length;
    file += (i + 1) + ' 0 obj\n' + object + '\nendobj\n';
    return offset;
  });
  const xref = file.length;
  file += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  file += offsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  file += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  writeFileSync(new URL(filename, path), file);
  fingerprints[filename] = createHash('sha256').update(file).digest('hex');
}

const supplier = 'Supplier: Harbor Coffee Roasters';
const currency = 'Currency: USD';
const line = (item, description, quantity, price) =>
  'Item: ' + item + ' | Description: ' + description + ' | Quantity: ' + quantity + ' | Unit price: ' + price;
for (const [name, number, item, description, price, total] of [
  ['invoice', '2101', 'HOUSE-1KG', 'House blend coffee, 1 kg bag', '12.00', '1200.00'],
  ['invoice-corrected', '2102', 'HOUSE-1KG', 'House blend coffee, 1 kg bag', '10.00', '1000.00'],
  ['invoice-decaf', '2103', 'DECAF-1KG', 'Decaf coffee, 1 kg bag', '12.00', '1200.00'],
]) {
  pdf(name + '.pdf', [[
    'Coffee delivery invoice', supplier, 'Bill to: Juniper Cafe', 'Invoice number: INV-' + number,
    'Invoice date: 2026-06-18', currency, line(item, description, 100, price),
    'Amount due: ' + total + ' USD', 'Fictional demonstration document',
  ]]);
}
const old = 'Item: HOUSE-1KG | Unit price: 12.00 | From: 2026-01-01 | To: 2026-06-01';
const current = 'Item: HOUSE-1KG | Unit price: 10.00 | From: 2026-06-01 | To: Open';
pdf('agreement.pdf', [
  ['Coffee supply agreement', supplier, 'Buyer: Juniper Cafe', currency, 'Section 2.1 | Original price schedule', old, 'End dates are exclusive.', 'Fictional demonstration document'],
  ['Amendment AMD-01', supplier, currency, 'Section 2.1 | Updated house blend price', current, 'This price applies from June 1, 2026.', 'Fictional demonstration document'],
]);
pdf('agreement-overlap.pdf', [
  ['Coffee supply agreement', supplier, currency, old, 'End dates are exclusive.', 'Fictional demonstration document'],
  ['Two signed pricing schedules', supplier, currency, current,
    'Item: HOUSE-1KG | Unit price: 11.00 | From: 2026-06-10 | To: Open', 'Fictional demonstration document'],
]);

const manifest = new URL('../src/sample-fingerprints.json', import.meta.url);
writeFileSync(manifest, JSON.stringify(fingerprints, null, 2) + '\n');