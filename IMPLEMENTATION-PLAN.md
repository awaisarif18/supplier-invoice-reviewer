# Supplier Invoice Reviewer upgrade

The landing page opens the $200 old-rate case. It shows how an invoice and its purchase order can agree at $12 while the applicable contract says $10.

| Route | Visitor task |
| --- | --- |
| `/` | Understand the $200 example and open the full review. |
| `/review/old-rate/` | Inspect the overcharge and record a decision. |
| `/review/correct-rate/` | See a matched invoice with a $0 difference. |
| `/review/missing-clause/` | See what evidence is needed before a difference can be calculated. |
| `/review/custom/` | Change the sample invoice, PO, and contract inputs and rerun the check. |

1. Migrate the existing reviewer and pure price check to React, Vite, and TypeScript. Use a shared React component and static HTML entries for the review URLs. Forward legacy sample links from the landing page.
2. Keep sample records in a JSON fixture. Use the same price check for samples, the landing proof, and the editable case. Validate dates, quantities, and decimal amounts before running a custom review. Keep the sample decision keys so existing notes remain readable.
3. Build the landing page with the visual system in DESIGN.md. Make the sample calculation and its clause visible before visitors reach the reviewer.
4. Build and test in GitHub Actions, then deploy the built files through the existing release workflow. Verify the release marker and all page URLs. Keep the existing rollback mechanism.

Acceptance checks: the three sample outcomes, a custom change from 100 to 150 units yielding a $300 difference, direct route reload, old hash links, and sample decision persistence. Check the landing page at desktop and phone widths.

## Direction contract

Thesis: agreement with the PO can conceal a stale supplier rate.
Own world: the existing marked proof sheet with forest green, paper, ochre, fine rules, and tabular figures.
Story: see the pricing mistake, inspect the amendment, then run the full review.
First viewport: editorial heading and main action on the left. The proof sheet on the right shows the three unit prices, invoice line total, and the calculated finding. On phones the proof follows the action.
Form: code-led proof sheet using the synthetic Old rate case. The landing page opens the signed pricing evidence inline.
Finish: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
