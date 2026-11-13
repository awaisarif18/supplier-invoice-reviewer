import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Brand } from './Brand';
import { ConfirmDocuments } from './ConfirmDocuments';
import { reviewPath } from './data';
import { extractionSchema, type Extraction } from './document-schema';
import { Review } from './Review';
import { extractSample, isBundledSample, sampleFiles } from './sample-extraction';
import type { ReviewInput, UploadDocument } from './upload-data';

const sampleUrl = (name: string) => '/samples/' + name;
const variants = {
  old: [sampleFiles.invoice, sampleFiles.agreement],
  correct: [sampleFiles.corrected, sampleFiles.agreement],
  missing: [sampleFiles.decaf, sampleFiles.agreement],
  overlap: [sampleFiles.invoice, sampleFiles.overlap],
} as const;
type Loaded = { invoice: UploadDocument; agreement: UploadDocument; data: Extraction; sample: boolean };

async function loadDocument(file: File): Promise<UploadDocument> {
  const { readPdf } = await import('./read-pdf');
  return { file, name: file.name, pages: await readPdf(file, file.name) };
}

async function sampleDocument(name: string) {
  const response = await fetch(sampleUrl(name));
  if (!response.ok) throw new Error('Could not load the sample PDF. Try again.');
  return loadDocument(new File([await response.blob()], name, { type: 'application/pdf' }));
}

async function requestExtraction(invoice: UploadDocument, agreement: UploadDocument) {
  const response = await fetch('/api/extract', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoice: invoice.pages, agreement: agreement.pages }),
    signal: AbortSignal.timeout(50000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || 'Extraction is unavailable here. Try the sample PDFs or enter the details manually.');
  const parsed = extractionSchema.safeParse(data);
  if (!parsed.success) throw new Error('Could not read the extracted fields. Try again or enter the details manually.');
  return parsed.data;
}

export function UploadReview() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState<Loaded>();
  const [review, setReview] = useState<{ input: ReviewInput; revision: number }>();
  const confirmRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (loaded) confirmRef.current?.focus(); }, [loaded]);
  useEffect(() => { if (review) resultRef.current?.focus(); }, [review]);

  async function extract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const sample = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'sample';
    setBusy(true);
    setError('');
    setLoaded(undefined);
    setReview(undefined);
    try {
      const [invoiceName, agreementName] = variants[String(form.get('variant')) as keyof typeof variants] ?? variants.old;
      const [invoice, agreement] = await Promise.all(sample
        ? [sampleDocument(invoiceName), sampleDocument(agreementName)]
        : [loadDocument(form.get('invoice') as File), loadDocument(form.get('agreement') as File)]);
      const localSample = sample || (
        await isBundledSample(invoice.file, [sampleFiles.invoice, sampleFiles.corrected, sampleFiles.decaf]) &&
        await isBundledSample(agreement.file, [sampleFiles.agreement, sampleFiles.overlap])
      );
      if (!localSample && !form.has('consent')) {
        setError('Confirm that the documents contain no confidential, sensitive, or personal information.');
        return;
      }
      const data = localSample ? extractSample(invoice.pages, agreement.pages) : await requestExtraction(invoice, agreement);
      setLoaded({ invoice, agreement, data, sample: localSample });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not read these documents.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="review-layout upload-layout">
    <aside className="rail"><Brand /><nav aria-label="Invoice tools">
      <a className="custom-link" aria-current="page" href={reviewPath('upload')}>Check an invoice</a>
      <a className="custom-link" href={reviewPath('custom')}>Enter details manually</a>
      <a className="custom-link" href="/#sample-cases">Browse sample cases</a>
    </nav></aside>
    <main id="workspace">
      <header className="page-head"><h1>Check an invoice</h1><p>Confirm what your supplier billed, then compare it with the agreement in effect on the invoice date.</p></header>
      <form className="input-sheet upload-sheet" onSubmit={extract}>
        <fieldset disabled={busy}>
          <legend>Invoice and pricing agreement</legend>
          <p>Choose two PDFs with selectable text. Each can be up to 5 MB and 12 pages.</p>
          <div className="input-grid">
            <label>Invoice PDF<input type="file" name="invoice" accept=".pdf,application/pdf" required /></label>
            <label>Pricing agreement PDF<input type="file" name="agreement" accept=".pdf,application/pdf" required /></label>
          </div>
          <label className="rate-toggle consent"><input type="checkbox" name="consent" /> These documents contain no confidential, sensitive, or personal information.</label>
          <p className="storage-note">Sample PDFs are read in your browser. For other PDFs, Extract sends their text to Google Gemini. Google may use free-tier submissions to improve its products.</p>
          <div className="actions"><button className="run-check" type="submit" value="upload">Extract fields</button></div>
          <div className="sample-picker">
            <div><label>Sample documents<select name="variant" defaultValue="old">
              <option value="old">Café invoice with old price</option><option value="correct">Corrected café invoice</option>
              <option value="missing">Decaf without an agreed price</option><option value="overlap">Two competing prices</option>
            </select></label></div>
            <button className="edit-reset" type="submit" value="sample" formNoValidate>Try sample documents</button>
            <a href={sampleUrl(sampleFiles.invoice)} download>Download sample invoice</a>
            <a href={sampleUrl(sampleFiles.agreement)} download>Download sample agreement</a>
          </div>
        </fieldset>
        {busy && <p role="status">Reading the documents…</p>}
        {error && <p role="alert" className="input-error">{error}</p>}
      </form>
      {loaded && <div ref={confirmRef} className="upload-stage" tabIndex={-1}>
        {loaded.sample && <p className="review-update">Sample PDFs read locally.</p>}
        <ConfirmDocuments {...loaded} onReview={input => setReview(previous => ({ input, revision: (previous?.revision ?? 0) + 1 }))} />
      </div>}
      {review && <div ref={resultRef} className="upload-stage" tabIndex={-1} role="region" aria-label="Price check result">
        <Review key={review.revision} {...review.input} />
      </div>}
    </main>
  </div>;
}
