export interface Customer {
  tpId: number;
  custId: number;
  customerName: string;
  customerNmbr: string;
  erpAcctNmbr: string | null;
  customerType: string;
  status: 'ACTIVE' | 'INACTIVE';
  customerUrl: string | null;
  notes: string | null;
  logoUrl: string | null;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface CustomerForm {
  customerName: string;
  customerNmbr: string;
  erpAcctNmbr: string;
  customerType: string;
  status: 'ACTIVE' | 'INACTIVE';
  customerUrl: string;
  notes: string;
  logoUrl: string;
}

export interface CustomersPage {
  data: Customer[];
  pagination: { totalRows: number; page: number; pageSize: number };
}
