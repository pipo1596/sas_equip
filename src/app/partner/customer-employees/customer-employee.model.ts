export interface CustomerEmployee {
  empId: number;
  tpId: number;
  custId: number;
  empNum: string | null;
  internalId: string | null;
  badgeNum: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  emailAddress: string;
  role: string | null;
  empRank: string | null;
  hireDate: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON-LEAVE';
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

export interface CustomerEmployeeForm {
  empNum: string;
  internalId: string;
  badgeNum: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress: string;
  role: string;
  empRank: string;
  hireDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON-LEAVE';
  mfaEnabled: 'Y' | 'N';
  mfaMethod: string;
  password: string;
}

export interface CustomerEmployeesPage {
  data: CustomerEmployee[];
  pagination: { totalRows: number; page: number; pageSize: number };
}
