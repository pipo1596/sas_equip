export interface PlatformAdmin {
  padminId: number;
  username: string;
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
  admins: PlatformAdmin[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PlatformAdminForm {
  username: string;
  emailAddress: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  mfaEnabled: 'Y' | 'N';
  mfaMethod: string;
  password: string;
}
