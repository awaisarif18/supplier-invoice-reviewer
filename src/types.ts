export interface Invoice {
  invoiceId: string;
  line: number;
  supplierId: string;
  supplier: string;
  item: string;
  description: string;
  invoiceDate: string;
  quantity: number;
  chargedCents: number;
  poId: string | null;
  poCents: number | null;
  clause?: string;
}

export interface Sample extends Invoice {
  id: string;
  name: string;
}

export interface Rate {
  supplierId: string;
  item: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  unitCents: number;
  source: string;
  document: string;
  clause: string;
}
