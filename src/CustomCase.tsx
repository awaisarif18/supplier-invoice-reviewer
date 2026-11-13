import { useState, type FormEvent } from 'react';
import { checkPrice } from './check';
import { rates } from './data';
import { maxPrice, maxQuantity, pricePattern, readPrice } from './pricing-input';
import type { Invoice, Rate } from './types';

const dollars = (cents: number) => (cents / 100).toFixed(2);

export function CustomCase({ invoice, onReview }: { invoice: Invoice; onReview: (invoice: Invoice, rates: Rate[]) => void }) {
  const sampleRate = checkPrice(invoice, rates).rate;
  const [hasRate, setHasRate] = useState(Boolean(sampleRate));
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? '').trim();
    const effectiveFrom = text('effective-from');
    const effectiveTo = text('effective-to') || null;
    const chargedCents = readPrice(text('invoice-price'));
    const poCents = readPrice(text('po-price'));
    const unitCents = readPrice(text('contract-price'));
    if (!text('supplier') || !text('item') || chargedCents === null || poCents === null) {
      setError('Enter a supplier, an item, and valid prices for the invoice and purchase order.');
      return;
    }
    if (hasRate && effectiveTo && effectiveTo <= effectiveFrom) {
      setError('The end date must be after the effective date.');
      return;
    }
    if (hasRate && (unitCents === null || !text('clause-ref') || !text('clause'))) {
      setError('Enter the agreed price, the agreement reference, and the relevant text.');
      return;
    }
    const edited = {
      ...invoice, invoiceId: text('invoice-number') || 'Edited invoice',
      supplier: text('supplier'), description: text('item'),
      invoiceDate: text('invoice-date'), quantity: Number(text('quantity')), chargedCents, poCents,
    };
    const enteredRates: Rate[] = hasRate && unitCents !== null ? [{
      supplierId: edited.supplierId, item: edited.item, unitCents, effectiveFrom, effectiveTo,
      source: text('clause-ref'), document: 'Entered supplier agreement', clause: text('clause'),
    }] : [];
    setError('');
    onReview(edited, enteredRates);
  }

  return <form className="input-sheet" onSubmit={submit} onChange={() => error && setError('')}>
    <fieldset>
      <legend>Invoice and purchase order</legend>
      <p>Enter what the supplier billed and what you originally ordered.</p>
      <div className="input-grid">
        <label>Supplier<input required name="supplier" maxLength={80} defaultValue={invoice.supplier} /></label>
        <label>Item<input required name="item" maxLength={100} defaultValue={invoice.description} /></label>
        <label>Invoice number <span>(optional)</span><input name="invoice-number" maxLength={45} defaultValue={invoice.invoiceId} /></label>
        <label>Invoice date<input required name="invoice-date" type="date" min="1900-01-01" max="9999-12-31" defaultValue={invoice.invoiceDate} /></label>
        <label>Quantity<input required name="quantity" type="number" min="1" max={maxQuantity} step="1" defaultValue={invoice.quantity} /></label>
        <PriceInput name="invoice-price" label="Invoice unit price" cents={invoice.chargedCents} />
        <PriceInput name="po-price" label="Purchase order unit price" cents={invoice.poCents} />
      </div>
    </fieldset>
    <fieldset>
      <legend>Supplier agreement</legend>
      <label className="rate-toggle"><input type="checkbox" checked={hasRate} onChange={event => setHasRate(event.target.checked)} /> I have an agreed price for this item</label>
      <fieldset className="rate-fields" disabled={!hasRate} hidden={!hasRate} aria-label="Agreed price details">
        <div className="input-grid">
          <PriceInput name="contract-price" label="Agreed unit price" cents={sampleRate?.unitCents} />
          <label>Effective from<input required name="effective-from" type="date" min="1900-01-01" max="9999-12-31" defaultValue={sampleRate?.effectiveFrom ?? invoice.invoiceDate} /></label>
          <label>Ends before <span>(optional)</span><input name="effective-to" type="date" min="1900-01-01" max="9999-12-31" defaultValue={sampleRate?.effectiveTo ?? ''} /></label>
          <label>Agreement reference<input required name="clause-ref" maxLength={90} defaultValue={sampleRate?.source ?? ''} /></label>
        </div>
        <label className="clause-label">Agreed price in writing<textarea required name="clause" rows={3} maxLength={1000} defaultValue={sampleRate?.clause ?? ''} /></label>
      </fieldset>
    </fieldset>
    {error && <p className="input-error" role="alert">{error}</p>}
    <div className="actions"><button type="submit" className="run-check">Run price check</button></div>
    <p className="storage-note">Custom inputs stay in this tab until you leave or refresh.</p>
  </form>;
}

function PriceInput({ name, label, cents }: { name: string; label: string; cents?: number | null }) {
  return <label>{label} <span>(USD)</span><input required name={name} type="text" inputMode="decimal"
    pattern={pricePattern} maxLength={10} defaultValue={cents == null ? '' : dollars(cents)}
    onChange={event => {
      const input = event.currentTarget;
      input.setCustomValidity(Number(input.value) > maxPrice ? 'Enter a price of $1,000,000 or less.' : '');
    }} /></label>;
}
