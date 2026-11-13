import { useState } from 'react';
import { Chevron } from './Brand';
import { checkPrice } from './check';
import { money, oldRate, rates } from './data';
import { maxQuantity, readPrice } from './pricing-input';

const originalPrice = (oldRate.chargedCents / 100).toFixed(2);
const contract = checkPrice(oldRate, rates).rate!;

export function LiveExample() {
  const [bags, setBags] = useState(String(oldRate.quantity));
  const [price, setPrice] = useState(originalPrice);
  const quantity = Number(bags);
  const chargedCents = readPrice(price);
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 && quantity <= maxQuantity;
  const result = validQuantity && chargedCents !== null ? checkPrice({ ...oldRate, quantity, chargedCents }, rates) : null;
  const difference = result?.differenceCents ?? null;

  return <article className="proof" aria-labelledby="example-title">
    <header className="proof-header">
      <div><p>Fictional café invoice</p><h2 id="example-title">Coffee bean delivery</h2></div>
    </header>
    <div className="proof-body">
      <div className="proof-inputs">
        <label>Number of bags<input type="number" min={1} max={maxQuantity} step={1} value={bags} onChange={event => setBags(event.target.value)} aria-invalid={!validQuantity} /></label>
        <label>Invoice price per bag ($)<input type="text" inputMode="decimal" maxLength={10} value={price} onChange={event => setPrice(event.target.value)} aria-invalid={chargedCents === null} /></label>
      </div>
      <table>
        <thead><tr><th scope="col">Where the price came from</th><th scope="col">Per bag</th></tr></thead>
        <tbody>
          <tr><th scope="row">Purchase order</th><td>{money(oldRate.poCents)}</td></tr>
          <tr className="proof-contract"><th scope="row">Supplier agreement</th><td>{money(contract.unitCents)}</td></tr>
        </tbody>
      </table>
      <div className={`proof-finding${difference === 0 ? ' proof-matched' : ''}`} role="status">
        {difference === null ? <p>Enter 1 to 1,000,000 whole bags and a price from $0 to $1,000,000 with up to two decimal places.</p>
          : <><div><strong>{difference > 0 ? 'Charged too much' : difference < 0 ? 'Charged too little' : 'Invoice price is correct'}</strong>
            <p>Bill: {money(result!.invoicedCents)} · Agreed: {money(result!.expectedCents)}</p></div>
            <strong>{money(Math.abs(difference))}</strong></>}
      </div>
      <div className="proof-actions">
        <details className="proof-source">
          <summary><span>Read the supplier’s price update</span><Chevron /></summary>
          <div><blockquote>{contract.clause}</blockquote></div>
        </details>
        <button type="button" className="proof-reset" onClick={() => { setBags(String(oldRate.quantity)); setPrice(originalPrice); }}>Reset example</button>
      </div>
    </div>
  </article>;
}
