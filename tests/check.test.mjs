import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { checkPrice } from '../src/check.ts';

const { cases: [oldRate, correctRate, missingClause], rates } = JSON.parse(
  readFileSync(new URL('../src/fixtures.json', import.meta.url)),
);

test('old PO rate matches invoice yet overcharges by $200', () => {
  const result = checkPrice(oldRate, rates);
  assert.equal(result.poMatches, true);
  assert.equal(result.status, 'Price discrepancy');
  assert.equal(result.invoicedCents, 120000);
  assert.equal(result.expectedCents, 100000);
  assert.equal(result.differenceCents, 20000);
  assert.equal(result.rate.source, 'AMD-01 · §2.1');
});

test('correct rate matches with zero difference', () => {
  const result = checkPrice(correctRate, rates);
  assert.equal(result.status, 'Matched');
  assert.equal(result.differenceCents, 0);
});

test('missing item evidence leaves contract amounts blank', () => {
  const result = checkPrice(missingClause, rates);
  assert.equal(result.status, 'Needs review');
  assert.equal(result.rate, null);
  assert.equal(result.expectedCents, null);
  assert.equal(result.differenceCents, null);
});

test('effective date includes the start and excludes the prior rate end', () => {
  assert.equal(checkPrice({ ...oldRate, invoiceDate: '2026-05-31' }, rates).rate.unitCents, 1200);
  assert.equal(checkPrice({ ...oldRate, invoiceDate: '2026-06-01' }, rates).rate.unitCents, 1000);
});

test('a different supplier or overlapping rates require review', () => {
  assert.equal(checkPrice({ ...oldRate, supplierId: 'OTHER' }, rates).status, 'Needs review');
  assert.equal(checkPrice(oldRate, [...rates, rates[1]]).status, 'Needs review');
});

test('undercharges retain a signed difference', () => {
  assert.equal(checkPrice({ ...oldRate, chargedCents: 975 }, rates).differenceCents, -2500);
});
