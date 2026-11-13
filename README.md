# Supplier Invoice Reviewer

An accounts payable reviewer can check a supplier's invoice against the contract rate effective on the invoice date, inspect the source records, and record a decision.

## Run locally

With Node.js 20+ and Python 3 installed:

```sh
npm test
npm start
```

Open http://localhost:8080. The app has no package dependencies, build step, or backend. For hosting, serve the contents of `public/` as static files. Serve `.mjs` as JavaScript and `.json` as JSON.

## One-minute walkthrough

1. Open **Old rate** (the default). The invoice and PO agree at $12.00 per unit. The contract amendment sets $10.00 per unit. For 100 units the invoice shows $1,200.00 and the expected total is $1,000.00.
2. Click the **$200.00 overcharge**. The invoice row supplies the $12.00 unit price and quantity. Signed pricing amendment AMD-01 §2.1 supplies the $10.00 rate and its June 1 effective date. Each source also opens individually.
3. Enter **Invoice uses the previous rate.** and click **Confirm finding**. Refresh. The check still shows **Price discrepancy**, and **Confirmed** and the note persist in this browser.
4. Open **Missing clause**. **Needs review** identifies the pricing evidence to request. Expected total and difference are unset.
5. Open **Correct rate** to see **Matched** with a $0.00 difference.

## Implementation

- `public/fixtures.json` contains synthetic invoice lines and readable sample contract clauses.
- `public/check.mjs` matches supplier ID, item code, and invoice date. Effective periods include their start and exclude their end. Missing and overlapping rates require review.
- The difference is `(charged unit cents - contract unit cents) × quantity`. An undercharge produces a negative amount in the calculation.
- Browser storage records the decision and note by invoice line. A failed save is reported in the UI.
- `tests/check.test.mjs` covers the three cases, the effective date boundary, supplier and overlap matching, and signed arithmetic.

For Plinto, start with the price difference that the PO check missed. For Juritas, open the signed pricing amendment. For Agent F, trace the calculation through the source records and the saved decision.
