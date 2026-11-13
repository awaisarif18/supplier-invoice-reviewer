import { useEffect, useRef, useState } from 'react';
import { Brand } from './Brand';
import { CustomCase } from './CustomCase';
import { oldRate, rates, reviewPath, samples } from './data';
import { Review } from './Review';
import type { Invoice, Rate } from './types';

const stories: Record<string, string> = {
  'old-rate': 'The café ordered 100 bags at the old $12 price. The supplier had agreed to charge $10 by the time it sent the invoice.',
  'correct-rate': 'The supplier billed the café $10 per bag, the price in the updated agreement.',
  'missing-clause': 'The café ordered decaf. The agreement only lists the price for house blend, so the café needs to ask for the decaf price.',
};

export function ReviewPage({ caseId }: { caseId: string }) {
  const sample = samples.find(item => item.id === caseId);
  const custom = caseId === 'custom';
  const [editing, setEditing] = useState(custom);
  const [input, setInput] = useState<{ invoice: Invoice; rates: Rate[]; run: number }>();
  const [editorVersion, setEditorVersion] = useState(0);

  const resultRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (input) resultRegion.current?.focus();
  }, [input]);

  function runReview(invoice: Invoice, rates: Rate[]) {
    setInput(previous => ({ invoice, rates, run: (previous?.run ?? 0) + 1 }));
  }

  function restoreSample() {
    setInput(undefined);
    setEditorVersion(version => version + 1);
  }

  return <div className="review-layout">
    <aside className="rail">
      <Brand />
      <nav aria-label="Sample cases">
        <h2>Sample cases</h2>
        <div id="cases">
          {samples.map(item => <a key={item.id} href={reviewPath(item.id)} aria-current={sample?.id === item.id ? 'page' : undefined}>
            <strong>{item.name}</strong><small>{item.invoiceId}</small>
          </a>)}
        </div>
        <a className="custom-link" href={reviewPath('upload')}>Check an invoice</a>
        <a className="custom-link" href={reviewPath('custom')} aria-current={custom ? 'page' : undefined}>Try your own case</a>
      </nav>
      <p className="rail-note">USD</p>
    </aside>
    <main id="workspace">
      <header className="page-head">
        <h1>{custom ? 'Try your own case' : sample?.name}</h1>
        <p>{custom ? 'Start with the coffee order or enter one invoice line of your own.' : stories[caseId]}</p>
        {sample && <div className="edit-actions">
          <button type="button" className="edit-toggle" aria-controls="case-editor" aria-expanded={editing} onClick={() => setEditing(value => !value)}>{editing ? 'Hide inputs' : input ? 'Edit your inputs' : 'Edit this example'}</button>
          {input && <button type="button" className="edit-reset" onClick={restoreSample}>Restore sample</button>}
        </div>}
      </header>
      <div id="case-editor" hidden={!editing}>
        <CustomCase key={editorVersion} invoice={sample ?? oldRate} onReview={runReview} />
      </div>

      <div ref={resultRegion} tabIndex={-1} aria-label="Price check result" role="region">
        {input && <p className="review-update" role="status">Result using your inputs</p>}
        {input ? <Review key={input.run} invoice={input.invoice} rates={input.rates} /> : (sample || custom) && <Review invoice={sample ?? oldRate} rates={rates} persist={Boolean(sample)} />}
      </div>
    </main>
  </div>;
}
