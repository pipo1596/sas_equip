export interface CustomerContact {
  contactId: number;
  tpId: number;
  custId: number;
  contactName: string;
  contactTitle: string | null;
  contactType: 'MAIN' | 'BILLING' | 'SUPPORT' | 'EMERGENCY' | 'OTHER';
  contactEmail: string;
  contactPhone: string | null;
  notes: string | null;
  isPrimary: 'Y' | 'N';
  status: 'ACTIVE' | 'INACTIVE';
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface CustomerContactForm {
  contactName: string;
  contactTitle: string;
  contactType: 'MAIN' | 'BILLING' | 'SUPPORT' | 'EMERGENCY' | 'OTHER';
  contactEmail: string;
  contactPhone: string;
  notes: string;
  isPrimary: 'Y' | 'N';
  status: 'ACTIVE' | 'INACTIVE';
}
