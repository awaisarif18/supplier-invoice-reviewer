# Supplier Invoice Reviewer

Check a supplier invoice against the contract rate effective on the invoice date, inspect the source records, and record a decision.

## Run locally

With Node.js 22.18+ installed:

```sh
npm ci
npm test
npm start
```

Open http://localhost:5173. To check the production bundle locally, run `npm run build` and `npm run preview`.

## One-minute walkthrough

1. On the landing page, try the fictional café invoice. The bill and purchase order show $12 per bag, but the supplier agreed to $10. For 100 bags, the bill is $200 too high. Change either input to see the total update, or open the case for the full review.
2. Click the finding to open the invoice row and pricing amendment. Add a note and confirm the finding. On reload, the note and decision persist in this browser while the check still shows **Price discrepancy**.
3. Open **Correct rate** for a $0.00 difference or **Missing clause** to see **Needs review** with no contract amounts.
4. Select **Edit this example** on any sample page. Change the inputs and run the check. Use **Restore sample** to start over. Open **Try your own case** to enter a different supplier and invoice line.

## Implementation

- React, Vite, and TypeScript produce one static HTML entry per page in `dist/`. The three sample pages share the same reviewer component.
- `src/fixtures.json` contains synthetic records. `src/check.ts` matches supplier, item, and invoice date and calculates the difference in integer cents. Missing or overlapping rates require review.
- Sample decisions use browser storage keyed by invoice line. Custom inputs and decisions live only in the current page.
- GitHub Actions tests and builds the project before publishing the resulting static archive through the existing Oracle deployment workflow.

See the [implementation plan](IMPLEMENTATION-PLAN.md) for the page map and acceptance checks.

## Check an invoice from PDFs

Open **Check an invoice** and choose **Try sample documents** to read the bundled fictional café PDFs in the browser. You can also download and upload the same PDFs, even if you rename them. The sample picker covers the old price, the corrected bill, a missing price, and competing prices. To regenerate the downloadable PDFs, run `node server/generate-samples.mjs`.

For other documents, set GEMINI_API_KEY in the server environment or in a local .env.local file before running npm start or npm run preview. The browser reads selectable text from the invoice and agreement, then sends that text and page numbers to the extraction endpoint after consent. The endpoint sends the text to Google Gemini. For free-tier use, submit fictional or public documents that contain no sensitive, confidential, or personal information. The app keeps documents and results in the current tab and checks one USD invoice line at a time. It supports up to 5 MB, 12 pages, and 18,000 extracted characters per file. If the file is scanned or encrypted, use a readable PDF or enter the fields manually.

For a deployment, keep serving dist/ as static files. Run npm ci and npm run api from the source checkout as a service with Node 22.18+ and the server environment configured. Proxy only /api/extract to 127.0.0.1:8787 through the existing HTTPS host, keeping the key on the server. The endpoint limits concurrent requests and requests per minute. The static sample flow works without this service.

The workflow asks the reviewer to confirm extracted fields before running the price check. Use the source links to open the original PDF at the cited page. For Nermina, show the invoice row and page two of the agreement that support the $200 finding.
