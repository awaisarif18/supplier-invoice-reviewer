import { useRef, useState, type FormEvent } from 'react';
import { Chevron, DocumentIcon } from './Brand';
import { checkPrice } from './check';
import { date, money } from './data';
import type { Invoice, Rate } from './types';

const decisionNames = { awaiting: 'Awaiting review', confirmed: 'Confirmed', dismissed: 'Dismissed' };
type Decision = keyof typeof decisionNames;

function readDecision(key: string | null): { decision: Decision; note: string } {
  if (key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (value && (value.decision === 'confirmed' || value.decision === 'dismissed') && typeof value.note === 'string') {
        return { decision: value.decision, note: value.note };
      }
    } catch {
      // A blocked or malformed record leaves the line available to review.
    }
  }
  return { decision: 'awaiting', note: '' };
}

export function Review({ invoice, rates, reason, persist = false }: { invoice: Invoice; rates: Rate[]; reason?: string; persist?: boolean }) {
  const result = checkPrice(invoice, rates);
  const { rate, differenceCents, unitDifferenceCents } = result;
  const findingClass = rate === null ? 'uncertain' : result.status === 'Matched' ? 'matched' : 'flagged';
  const invoiceSource = useRef<HTMLDetailsElement>(null);
  const contractSource = useRef<HTMLDetailsElement>(null);
  const [expanded, setExpanded] = useState(false);
  const storageKey = persist ? `invoice-review:v1:${invoice.invoiceId}:${invoice.line}` : null;

  function syncExpanded() {
    setExpanded(Boolean(invoiceSource.current?.open && contractSource.current?.open));
  }

  function toggleSources() {
    const open = !(invoiceSource.current?.open && contractSource.current?.open);
    if (invoiceSource.current) invoiceSource.current.open = open;
    if (contractSource.current) contractSource.current.open = open;
    syncExpanded();
  }

  function revealSource(record: HTMLDetailsElement | null) {
    if (!record) return;
    record.open = true;
    record.querySelector('summary')?.focus();
    syncExpanded();
  }

  return <article className="sheet" aria-labelledby="invoice-id">
    <header className="invoice-head">
      <div><h2 id="invoice-id">{invoice.invoiceId}</h2><p>{invoice.supplier}</p></div>
      <dl className="invoice-meta"><div><dt>Invoice date</dt><dd>{date(invoice.invoiceDate)}</dd></div><div><dt>Purchase order</dt><dd>{invoice.poId ?? 'Not provided'}</dd></div></dl>
    </header>
    <div className="work-grid">
      <section className="comparison" aria-labelledby="comparison-title">
        <div className="section-head"><h3 id="comparison-title">Price comparison</h3><span className={`status ${findingClass}`}>{result.status}</span></div>
        <div className="line"><div><strong>{invoice.description}</strong></div><strong>{invoice.quantity} units</strong></div>
        <div className="price-table" tabIndex={0} role="region" aria-label="Invoice, purchase order, and contract amounts">
          <table>
            <thead><tr><th scope="col">Source</th><th scope="col">Unit price</th><th scope="col">Line total</th></tr></thead>
            <tbody>
              <tr><th scope="row"><a href="#invoice-source" onClick={event => { event.preventDefault(); revealSource(invoiceSource.current); }}>Invoice</a></th><td>{money(invoice.chargedCents)}</td><td>{money(result.invoicedCents)}</td></tr>
              <tr><th scope="row">Purchase order</th><td>{money(invoice.poCents)}</td><td>{money(invoice.poCents === null ? null : invoice.poCents * invoice.quantity)}</td></tr>
              <tr className="contract"><th scope="row">{rate ? <a href="#contract-source" onClick={event => { event.preventDefault(); revealSource(contractSource.current); }}>Contract</a> : 'Contract'}</th><td>{money(rate?.unitCents ?? null)}</td><td>{money(result.expectedCents)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="po-note">{result.poMatches === null ? 'Purchase order not provided.' : result.poMatches ? <>Invoice and purchase order agree at <strong>{money(invoice.poCents)} per unit.</strong></> : 'Invoice and purchase order show different unit prices.'}</p>
        {rate && differenceCents !== null && unitDifferenceCents !== null
          ? <button type="button" className={`finding ${findingClass}`} aria-controls="evidence" aria-expanded={expanded} onClick={toggleSources}>
            <span><strong>{differenceCents === 0 ? 'No price difference' : differenceCents > 0 ? 'Overcharge' : 'Undercharge'}</strong>
              <small>{money(Math.abs(unitDifferenceCents))} per unit × {invoice.quantity} units</small></span>
            <span className="finding-value">{money(Math.abs(differenceCents))}<Chevron /></span>
          </button>
          : <div className="finding uncertain"><strong>Contract evidence needed</strong><p>{reason ?? result.reason}</p></div>}
        <p className="next-step">{differenceCents === null ? 'Resolve the missing or conflicting pricing evidence before approving the bill.' : differenceCents > 0 ? 'Ask the supplier for a corrected invoice. Open the finding to see the two records behind it.' : differenceCents < 0 ? 'The bill is lower than the agreed price. Verify the difference with the supplier.' : 'The bill passes this price check. You can continue with your usual invoice checks.'}</p>
        <section id="evidence" aria-labelledby="evidence-title">
          <h3 id="evidence-title">Source evidence</h3>
          <div className="source-list">
            <details className="source" id="invoice-source" ref={invoiceSource} onToggle={syncExpanded}>
              <summary><DocumentIcon /><span><strong>{invoice.invoiceId} · Row {invoice.line}</strong><small>Invoice row</small></span><Chevron /></summary>
              <div className="source-body">{invoice.clause && <blockquote>{invoice.clause}</blockquote>}<dl className="source-fields">
                <div><dt>Item</dt><dd>{invoice.description}</dd></div><div><dt>Quantity</dt><dd>{invoice.quantity}</dd></div>
                <div><dt>Unit price</dt><dd>{money(invoice.chargedCents)}</dd></div><div><dt>Line total</dt><dd>{money(result.invoicedCents)}</dd></div>
              </dl></div>
            </details>
            {rate && <details className="source" id="contract-source" ref={contractSource} onToggle={syncExpanded}>
              <summary><DocumentIcon /><span><strong>{rate.source}</strong><small>{rate.document}</small></span><Chevron /></summary>
              <div className="source-body"><p className="effective">Effective {date(rate.effectiveFrom)}{rate.effectiveTo && <> · ends before {date(rate.effectiveTo)}</>}</p><blockquote>{rate.clause}</blockquote></div>
            </details>}
          </div>
        </section>
      </section>
      <DecisionPanel status={result.status} storageKey={storageKey} />
    </div>
  </article>;
}

function DecisionPanel({ status, storageKey }: { status: ReturnType<typeof checkPrice>['status']; storageKey: string | null }) {
  const [saved, setSaved] = useState(() => readDecision(storageKey));
  const [note, setNote] = useState(saved.note);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState('');
  const scope = storageKey ? 'in this browser' : 'for this run';

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const decision = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value');
    if (decision !== 'confirmed' && decision !== 'dismissed') return;
    const record = { decision, note: note.trim() };
    try {
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(record));
      setSaved({ decision, note: record.note });
      setError(false);
      setMessage(`${decisionNames[decision]}. Decision saved ${scope}.`);
    } catch {
      setError(true);
      setMessage('Could not save. Allow browser storage and try again.');
    }
  }

  return <section className="decision" aria-labelledby="decision-title">
    <h3 id="decision-title">Reviewer decision</h3>
    <p className="decision-status"><span className={`status ${saved.decision}`}>{decisionNames[saved.decision]}</span></p>
    {status === 'Price discrepancy' ? <form onSubmit={save}>
      <label htmlFor="note">Review note <span>(optional)</span></label>
      <textarea id="note" name="note" maxLength={500} rows={4} placeholder="Add the reason for your decision" value={note} onChange={event => setNote(event.target.value)} />
      <div className="actions"><button type="submit" value="confirmed">Confirm finding</button><button type="submit" value="dismissed">Dismiss</button></div>
      <p className={`storage-note${error ? ' save-error' : ''}`} role="status">{message || (saved.decision === 'awaiting' ? `Decisions are saved ${scope}.` : `Decision saved ${scope}.`)}</p>
    </form> : <p className="decision-copy">{status === 'Needs review' ? 'Obtain the applicable contract evidence before deciding whether there is a discrepancy.' : 'No reviewer decision is required for this line.'}</p>}
  </section>;
}
