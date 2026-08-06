export interface Customer {
  tpId: number;
  custId: number;
  customerName: string;
  customerNmbr: string;
  erpAccountNmbr: string | null;
  customerType: string;
  status: 'ACTIVE' | 'INACTIVE';
  customerUrl: string | null;
  notes: string | null;
  mainContactName: string | null;
  mainContactEmail: string | null;
  mainContactPhone: string | null;
  csrName: string | null;
  csrEmail: string | null;
  csrPhone: string | null;
  supportName: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface CustomerForm {
  customerName: string;
  customerNmbr: string;
  erpAccountNmbr: string;
  customerType: string;
  status: 'ACTIVE' | 'INACTIVE';
  customerUrl: string;
  notes: string;
  mainContactName: string;
  mainContactEmail: string;
  mainContactPhone: string;
  csrName: string;
  csrEmail: string;
  csrPhone: string;
  supportName: string;
  supportEmail: string;
  supportPhone: string;
}

export interface CustomersPage {
  data: Customer[];
  pagination: { totalRows: number; page: number; pageSize: number };
}
