export interface CustomerProgramViewLocation {
  locId: number;
  locName: string;
}

export interface CustomerProgramView {
  viewId: number;
  programId: number;
  tpId: number;
  viewName: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  assignedLocations: CustomerProgramViewLocation[];
  categoryTotalCount: number;
  categorySelectedCount: number;
  prodTotalCount: number;
  prodSelectedCount: number;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface CustomerProgramViewForm {
  viewName: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CustomerProgramViewsPage {
  data: CustomerProgramView[];
  pagination: { totalRows: number; page: number; pageSize: number };
}

// Which categories/SKU placements are directly included in a View — the
// rolled-up "included via an ancestor category" state is computed client-side
// against the program's full tree, not returned here.
export interface ViewSelections {
  categoryIds: number[];
  progProdIds: number[];
}
