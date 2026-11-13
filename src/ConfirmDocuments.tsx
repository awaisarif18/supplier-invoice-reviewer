import { useEffect, useState, type FormEvent } from 'react';
import type { Extraction } from './document-schema';
import { confirmedInputs, prepareFields, type Editable, type ReviewInput, type UploadDocument } from './upload-data';

const emptyLine = { item: null, description: null, quantity: null, price: null };
const emptyRate = { item: null, price: null, from: null, to: null };

function usePdfUrl(file: Blob) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

export function ConfirmDocuments({ data, invoice, agreement, onReview }: {
  data: Extraction; invoice: UploadDocument; agreement: UploadDocument;
  onReview: (input: ReviewInput) => void;
}) {
  const [line, setLine] = useState(0);
  const [error, setError] = useState('');
  const [extraRates, setExtraRates] = useState(0);
  const invoiceUrl = usePdfUrl(invoice.file);
  const agreementUrl = usePdfUrl(agreement.file);
  const { lines, ...header } = data.invoice;
  const fields = prepareFields({ ...header, ...(lines[line] ?? emptyLine) }, invoice.pages);
  const agreementFields = prepareFields({ supplier: data.agreement.supplier, currency: data.agreement.currency }, agreement.pages);
  const rows = [...data.agreement.rates, ...Array.from({ length: extraRates }, () => emptyRate)].map(rate => prepareFields(rate, agreement.pages));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const input = confirmedInputs(form, line + 1, rows, { invoice: invoice.name, agreement: agreement.name });
      const source = fields.price.original;
      if (source) input.invoice.clause = 'Original invoice · Page ' + source.page + ': ' + source.quote;
      setError('');
      onReview(input);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Review the fields and try again.');
    }
  }

  return <form className="input-sheet confirm-docs" onSubmit={submit}>
    <h2>Confirm what the documents say</h2>
    <p>Check the quoted text and correct any field before running the price check.</p>
    <fieldset>
      <legend>Invoice · {invoice.name}</legend>
      <a className="pdf-link" href={invoiceUrl} target="_blank" rel="noreferrer">Open invoice PDF</a>
      {lines.length > 1 && <label>Invoice line <select value={line} onChange={event => setLine(Number(event.target.value))}>
        {lines.map((item, i) => <option key={i} value={i}>{i + 1}. {item.description?.value ?? item.item?.value ?? 'Unnamed item'}</option>)}
      </select></label>}
      <div className="input-grid" key={line}>
        <EvidenceInput name="supplier" label="Supplier" field={fields.supplier} pdfUrl={invoiceUrl} required />
        <EvidenceInput name="number" label="Invoice number" field={fields.number} pdfUrl={invoiceUrl} required />
        <EvidenceInput name="date" label="Invoice date" field={fields.date} pdfUrl={invoiceUrl} type="date" required />
        <EvidenceInput name="currency" label="Invoice currency" field={fields.currency} pdfUrl={invoiceUrl} required />
        <EvidenceInput name="item" label="Item name or SKU" field={fields.item} pdfUrl={invoiceUrl} required />
        <EvidenceInput name="description" label="Item description" field={fields.description} pdfUrl={invoiceUrl} />
        <EvidenceInput name="quantity" label="Quantity" field={fields.quantity} pdfUrl={invoiceUrl} type="number" required />
        <EvidenceInput name="price" label="Billed unit price" field={fields.price} pdfUrl={invoiceUrl} required />
        <EvidenceInput name="po" label="Purchase order unit price (optional)" field={{ value: '', original: null }} />
      </div>
    </fieldset>
    <fieldset>
      <legend>Pricing agreement · {agreement.name}</legend>
      <a className="pdf-link" href={agreementUrl} target="_blank" rel="noreferrer">Open agreement PDF</a>
      <div className="input-grid">
        <EvidenceInput name="agreement-supplier" label="Supplier on agreement" field={agreementFields.supplier} pdfUrl={agreementUrl} />
        <EvidenceInput name="agreement-currency" label="Agreement currency" field={agreementFields.currency} pdfUrl={agreementUrl} />
      </div>
      {!rows.length && <p>No fixed rates were extracted. Add a rate if you can verify one in the agreement.</p>}
      {rows.map((row, i) => <fieldset key={i} className="rate-review">
        <legend>Rate {i + 1}</legend>
        <div className="input-grid">
          <EvidenceInput name={'item-' + i} label="Agreement item name or SKU" field={row.item} pdfUrl={agreementUrl} />
          <EvidenceInput name={'price-' + i} label="Agreed unit price" field={row.price} pdfUrl={agreementUrl} />
          <EvidenceInput name={'from-' + i} label="Effective from" field={row.from} pdfUrl={agreementUrl} type="date" />
          <EvidenceInput name={'to-' + i} label="Ends before (YYYY-MM-DD or Open)" field={row.to} pdfUrl={agreementUrl} />
        </div>
      </fieldset>)}
      {extraRates < 5 && <button type="button" className="add-rate" onClick={() => setExtraRates(value => value + 1)}>Add an agreed rate</button>}
    </fieldset>
    {error && <p className="input-error" role="alert">{error}</p>}
    <div className="actions"><button type="submit" className="run-check">Confirm and run price check</button></div>
  </form>;
}

function EvidenceInput({ name, label, field, pdfUrl, type = 'text', required = false }: {
  name: string; label: string; field: Editable; pdfUrl?: string; type?: string; required?: boolean;
}) {
  const [value, setValue] = useState(field.value);
  return <div className="evidence-field">
    <label htmlFor={name}>{label}<input id={name} name={name} type={type} required={required}
      value={value} onChange={event => setValue(event.target.value)} /></label>
    {field.original ? <details className="field-source">
      <summary>{value.trim() === field.original.value ? 'Source · Page ' + field.original.page : 'Manually edited · Original page ' + field.original.page}</summary>
      <blockquote>{field.original.quote}</blockquote>
      {pdfUrl && <a href={pdfUrl + '#page=' + field.original.page} target="_blank" rel="noreferrer">Open PDF at page {field.original.page}</a>}
    </details> : <small>{value.trim() ? 'Manually entered' : name === 'po' ? 'Leave blank if unavailable' : 'No verified source found'}</small>}
  </div>;
}
