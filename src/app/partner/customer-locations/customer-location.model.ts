export interface CustomerLocation {
  locId: number;
  tpId: number;
  custId: number;
  parentId: number | null;
  locCode: string;
  locName: string;
  locType: 'REGION' | 'STATION' | 'DEPOT' | 'DEPARTMENT' | 'BRANCH';
  city: string;
  province: string;
  addressId: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  viewId: number | null;
  viewName: string | null;
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
  locType: 'REGION' | 'STATION' | 'DEPOT' | 'DEPARTMENT' | 'BRANCH';
  addressId: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  viewId: number | null;
}

export interface CustomerLocationsPage {
  data: CustomerLocation[];
  pagination: { totalRows: number; page: number; pageSize: number };
}
