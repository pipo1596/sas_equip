export interface PlatformAdmin {
  padminId: number;
  role: string;
  emailAddress: string;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  mfaEnabled: 'Y' | 'N';
  mfaMethod: string | null;
  lastLoginTs: string | null;
  lastLoginIp: string | null;
  failedLoginCt: number;
  lockedUntilTs: string | null;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface PlatformAdminsPage {
  data: PlatformAdmin[];
  pagination: {
    totalRows: number;
    page: number;
    pageSize: number;
  };  
}

export interface PlatformAdminForm {
  role: string;
  emailAddress: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  mfaEnabled: 'Y' | 'N';
  mfaMethod: string;
  password: string;
}
