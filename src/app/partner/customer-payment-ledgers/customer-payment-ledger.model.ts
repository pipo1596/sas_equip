export interface CustomerPaymentLedger {
  ledgerId: number;
  tpId: number;
  custId: number;
  ledgerName: string;
  ledgerType: 'DOLLAR' | 'POINTS' | 'CREDIT_CARD';
  amount: number | null; // null = unlimited; always null for CREDIT_CARD
  status: 'ACTIVE' | 'INACTIVE';
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface CustomerPaymentLedgerForm {
  ledgerName: string;
  ledgerType: 'DOLLAR' | 'POINTS' | 'CREDIT_CARD';
  amount: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CustomerPaymentLedgersPage {
  data: CustomerPaymentLedger[];
  pagination: { totalRows: number; page: number; pageSize: number };
}
