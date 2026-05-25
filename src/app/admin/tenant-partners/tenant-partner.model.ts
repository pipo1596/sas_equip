export interface TenantPartner {
  tpId: number;
  tpName: string;
  tpStatus: string;
  loginDomain: string | null;
  portalBaseDomain: string | null;
  mfaRequired: 'Y' | 'N';
  adminContactEmail: string | null;
  adminContactPhone: string | null;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface TenantPartnersPage {
  data: TenantPartner[];
  pagination: {
    totalRows: number;
    page: number;
    pageSize: number;
  };
}

export interface TenantPartnerForm {
  tpName: string;
  tpStatus: string;
  loginDomain: string;
  portalBaseDomain: string;
  mfaRequired: 'Y' | 'N';
  adminContactEmail: string;
  adminContactPhone: string;
}
