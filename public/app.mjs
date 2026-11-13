import { checkPrice } from './check.mjs';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dates = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const money = cents => cents === null ? '—' : currency.format(cents / 100);
const date = iso => dates.format(new Date(iso + 'T00:00:00Z'));
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const caseList = document.querySelector('#cases');
const workspace = document.querySelector('#review');
const chevron = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 9 6 6 6-6"/></svg>';
const icon = '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 3h7l4 4v14H6V3h1zm6 0v5h5M9 12h6m-6 4h6"/></svg>';
const decisionNames = { awaiting: 'Awaiting review', confirmed: 'Confirmed', dismissed: 'Dismissed' };

function readDecision(key) {
  try {
    const record = JSON.parse(localStorage.getItem(key));
    if (record && ['confirmed', 'dismissed'].includes(record.decision) && typeof record.note === 'string') {
      return record;
    }
  } catch {
    // A blocked or malformed stored record leaves the line available to review.
  }
  return { decision: 'awaiting', note: '' };
}

function source(id, title, subtitle, body) {
  return `<details class="source" id="${id}"><summary>${icon}<span><strong>${escape(title)}</strong><small>${escape(subtitle)}</small></span>${chevron}</summary><div class="source-body">${body}</div></details>`;
}

function render(invoice, rates) {
  const result = checkPrice(invoice, rates);
  const { rate, differenceCents, unitDifferenceCents } = result;
  const missing = rate === null;
  const matched = result.status === 'Matched';
  const key = `invoice-review:v1:${invoice.invoiceId}:${invoice.line}`;
  const saved = readDecision(key);
  const findingClass = missing ? 'uncertain' : matched ? 'matched' : 'flagged';
  const findingLabel = missing ? 'Contract evidence needed' : matched ? 'No price difference' : differenceCents > 0 ? 'Overcharge' : 'Undercharge';
  const invoiceReference = `${invoice.invoiceId} · Row ${invoice.line}`;
  const invoiceSource = source('invoice-source', invoiceReference, 'Invoice row', `
    <dl class="source-fields"><div><dt>Item</dt><dd>${escape(invoice.item)}</dd></div><div><dt>Quantity</dt><dd>${invoice.quantity}</dd></div><div><dt>Unit price</dt><dd>${money(invoice.chargedCents)}</dd></div><div><dt>Line total</dt><dd>${money(result.invoicedCents)}</dd></div></dl>`);
  const contractSource = rate ? source('contract-source', rate.source, rate.document, `
    <p class="effective">Effective ${date(rate.effectiveFrom)}${rate.effectiveTo ? ' · ends before ' + date(rate.effectiveTo) : ''}</p>
    <blockquote>${escape(rate.clause)}</blockquote>`) : '';

  workspace.innerHTML = `
    <article class="sheet">
      <header class="invoice-head">
        <div><h2>${escape(invoice.invoiceId)}</h2><p>${escape(invoice.supplier)}</p></div>
        <dl class="invoice-meta"><div><dt>Invoice date</dt><dd>${date(invoice.invoiceDate)}</dd></div><div><dt>Purchase order</dt><dd>${escape(invoice.poId)}</dd></div></dl>
      </header>
      <div class="work-grid">
        <section class="comparison" aria-labelledby="comparison-title">
          <div class="section-head"><h3 id="comparison-title">Price comparison</h3><span class="status ${findingClass}" aria-label="Check result: ${result.status}">${result.status}</span></div>
          <div class="line"><div><strong>${escape(invoice.description)}</strong><span>${escape(invoice.item)}</span></div><strong>${invoice.quantity} units</strong></div>
          <table>
            <thead><tr><th scope="col">Source</th><th scope="col">Unit price</th><th scope="col">Line total</th></tr></thead>
            <tbody>
              <tr><th scope="row"><a href="#invoice-source" data-source="invoice-source">Invoice</a></th><td>${money(invoice.chargedCents)}</td><td>${money(result.invoicedCents)}</td></tr>
              <tr><th scope="row">Purchase order</th><td>${money(invoice.poCents)}</td><td>${money(invoice.poCents * invoice.quantity)}</td></tr>
              <tr class="contract"><th scope="row">${rate ? '<a href="#contract-source" data-source="contract-source">Contract</a>' : 'Contract'}</th><td>${money(rate?.unitCents ?? null)}</td><td>${money(result.expectedCents)}</td></tr>
            </tbody>
          </table>
          <p class="po-note">${result.poMatches ? `Invoice and purchase order agree at <strong>${money(invoice.poCents)} per unit.</strong>` : 'Invoice and purchase order show different unit prices.'}</p>
          ${missing ? `<div class="finding uncertain"><strong>${findingLabel}</strong><p>${result.reason}</p><p>Request the signed pricing schedule or amendment for <strong>${escape(invoice.item)}</strong> effective on <strong>${date(invoice.invoiceDate)}</strong>.</p></div>` : `
            <button type="button" id="finding" class="finding ${findingClass}" aria-controls="evidence" aria-expanded="false">
              <span><strong>${findingLabel}</strong><small>${money(Math.abs(unitDifferenceCents))} per unit × ${invoice.quantity} units</small></span>
              <span class="finding-value">${money(Math.abs(differenceCents))}${chevron}</span>
            </button>`}
          <section id="evidence" aria-labelledby="evidence-title"><h3 id="evidence-title">Source evidence</h3><div class="source-list">${invoiceSource}${contractSource}</div></section>
        </section>
        <section class="decision" aria-labelledby="decision-title">
          <h3 id="decision-title">Reviewer decision</h3>
          <p class="decision-status"><span id="decision-label" class="status ${saved.decision}">${decisionNames[saved.decision]}</span></p>
          ${result.status === 'Price discrepancy' ? `
            <form id="decision-form">
              <label for="note">Review note <span>(optional)</span></label>
              <textarea id="note" name="note" maxlength="500" rows="4" placeholder="Add the reason for your decision">${escape(saved.note)}</textarea>
              <div class="actions"><button type="submit" name="decision" value="confirmed">Confirm finding</button><button type="submit" name="decision" value="dismissed">Dismiss</button></div>
              <p class="storage-note" role="status">${saved.decision === 'awaiting' ? 'Decisions are saved in this browser.' : 'Decision saved in this browser.'}</p>
            </form>` : `<p class="decision-copy">${missing ? 'Obtain the applicable contract evidence before deciding whether there is a discrepancy.' : 'No reviewer decision is required for this line.'}</p>`}
        </section>
      </div>
    </article>`;

  const evidence = [...workspace.querySelectorAll('.source')];
  const finding = workspace.querySelector('#finding');
  const syncExpanded = () => finding?.setAttribute('aria-expanded', String(evidence.every(item => item.open)));
  evidence.forEach(item => item.addEventListener('toggle', syncExpanded));
  finding?.addEventListener('click', () => {
    const open = !evidence.every(item => item.open);
    evidence.forEach(item => { item.open = open; });
    syncExpanded();
  });
  workspace.querySelectorAll('[data-source]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const record = document.getElementById(link.dataset.source);
      record.open = true;
      record.querySelector('summary').focus();
      syncExpanded();
    });
  });

  workspace.querySelector('#decision-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const decision = event.submitter?.value;
    if (decision !== 'confirmed' && decision !== 'dismissed') return;
    const note = workspace.querySelector('#note').value.trim();
    const message = workspace.querySelector('.storage-note');
    try {
      localStorage.setItem(key, JSON.stringify({ decision, note }));
    } catch {
      message.textContent = 'Could not save. Allow browser storage and try again.';
      message.classList.add('save-error');
      return;
    }
    const label = workspace.querySelector('#decision-label');
    label.className = `status ${decision}`;
    label.textContent = decisionNames[decision];
    message.classList.remove('save-error');
    message.textContent = `${decisionNames[decision]}. Decision saved in this browser.`;
  });
}

try {
  const response = await fetch(new URL('./fixtures.json', import.meta.url));
  if (!response.ok) throw new Error('Sample records unavailable');
  const { cases, rates } = await response.json();
  caseList.innerHTML = cases.map(item => `<button type="button" data-case="${escape(item.id)}"><strong>${escape(item.name)}</strong><small>${escape(item.invoiceId)}</small></button>`).join('');
  const selectCase = () => {
    const selected = cases.find(item => item.id === location.hash.slice(1)) ?? cases[0];
    caseList.querySelectorAll('button').forEach(button => {
      if (button.dataset.case === selected.id) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    render(selected, rates);
  };
  caseList.addEventListener('click', event => {
    const button = event.target.closest('[data-case]');
    if (button && location.hash !== '#' + button.dataset.case) location.hash = button.dataset.case;
  });
  window.addEventListener('hashchange', selectCase);
  selectCase();
} catch {
  workspace.innerHTML = '<p role="alert">Could not load the sample records. Refresh the page to try again.</p>';
}
