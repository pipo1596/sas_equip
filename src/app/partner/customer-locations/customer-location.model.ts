export interface CustomerLocation {
  locId: number;
  tpId: number;
  custId: number;
  parentId: number | null;
  locCode: string;
  locName: string;
  locType: 'REGION' | 'STATION' | 'DEPOT';
  city: string;
  province: string;
  status: 'ACTIVE' | 'INACTIVE';
  // Not a TP_CUST_LOCATIONS column — populated only if the API aggregates it
  // from employee-location assignments (no such link exists yet in TP_CUST_EMPLOYEES).
  employeeCount?: number;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface CustomerLocationForm {
  parentId: number | null;
  locCode: string;
  locName: string;
  locType: 'REGION' | 'STATION' | 'DEPOT';
  city: string;
  province: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CustomerLocationsPage {
  data: CustomerLocation[];
  pagination: { totalRows: number; page: number; pageSize: number };
}
