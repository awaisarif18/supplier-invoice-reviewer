import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createExtractionHandler } from '../server/extract.mjs';
import { verifiedField } from '../src/document-schema.ts';

const pages = [{ page: 2, text: 'Item: COFFEE | Unit price: 10.00' }];
const extraction = {
  invoice: { supplier: null, number: null, date: null, currency: null, lines: [] },
  agreement: { supplier: null, currency: null, rates: [] },
};

async function post(options, body) {
  const server = createServer(createExtractionHandler(options));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/extract', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('extraction endpoint sends page text to the provider and validates the response', async () => {
  const input = { invoice: pages, agreement: pages };
  const result = await post({ key: 'test-key', fetcher: async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
    assert.equal(options.headers['x-goog-api-key'], 'test-key');
    const request = JSON.parse(options.body);
    assert.equal(request.generationConfig.responseMimeType, 'application/json');
    assert.equal(request.generationConfig.responseJsonSchema.type, 'object');
    assert.deepEqual(JSON.parse(request.contents[0].parts[0].text), input);
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(extraction) }] } }] });
  } }, input);
  assert.deepEqual(result, { status: 200, body: extraction });
});

test('invalid documents never reach the provider and invalid provider data is rejected', async () => {
  const invalid = await post({ key: 'test', fetcher: () => assert.fail('Provider received invalid documents') }, { invoice: [], agreement: pages });
  assert.equal(invalid.status, 400);
  const refusal = await post({ key: 'test', fetcher: async () => Response.json({ candidates: [] }) }, { invoice: pages, agreement: pages });
  assert.equal(refusal.status, 502);
});

test('quotes must come from the cited page', () => {
  const field = { value: '10.00', page: 2, quote: 'Unit price: 10.00' };
  assert.deepEqual(verifiedField(field, pages), field);
  assert.equal(verifiedField({ ...field, page: 1 }, pages), null);
  assert.equal(verifiedField({ ...field, quote: 'Unit price: 12.00' }, pages), null);
});
