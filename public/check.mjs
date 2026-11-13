/**
 * Compare a single invoice line in USD. Rate periods include their start and
 * exclude their end. Fixture dates use ISO YYYY-MM-DD for direct comparison.
 */
export function checkPrice(invoice, rates) {
  const { supplierId, item, invoiceDate, chargedCents, poCents, quantity } = invoice;
  const invoicedCents = chargedCents * quantity;
  const poMatches = chargedCents === poCents;
  const applicable = rates.filter(rate =>
    rate.supplierId === supplierId &&
    rate.item === item &&
    rate.effectiveFrom <= invoiceDate &&
    (rate.effectiveTo === null || invoiceDate < rate.effectiveTo)
  );

  if (applicable.length !== 1) {
    const reason = applicable.length === 0
      ? 'No contract rate covers this supplier and item on the invoice date.'
      : 'Multiple contract rates cover this supplier and item on the invoice date.';
    return {
      status: 'Needs review', rate: null, invoicedCents, poMatches,
      expectedCents: null, differenceCents: null, unitDifferenceCents: null, reason,
    };
  }

  const [rate] = applicable;
  const unitDifferenceCents = chargedCents - rate.unitCents;
  return {
    status: unitDifferenceCents === 0 ? 'Matched' : 'Price discrepancy',
    rate, invoicedCents, poMatches, unitDifferenceCents,
    expectedCents: rate.unitCents * quantity,
    differenceCents: unitDifferenceCents * quantity,
  };
}
