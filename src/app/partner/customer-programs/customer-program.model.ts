export interface CustomerProgram {
  programId: number;
  tpId: number;
  custId: number;
  programName: string;
  priceListId: number | null;
  priceListName: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  lastSyncedTs: string | null;
  description: string | null;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface CustomerProgramForm {
  programName: string;
  priceListId: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  description: string;
}

export interface CustomerProgramsPage {
  data: CustomerProgram[];
  pagination: { totalRows: number; page: number; pageSize: number };
}

export interface CustomerProgramProduct {
  progProdId: number;
  progCatId: number;
  productPk: number;
  productName: string;
  skuCount: number;
  basePrice: number | null;
  customerPrice: number | null;
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CustomerProgramCategoryNode {
  progCatId: number;
  programId: number;
  parentProgCatId: number | null;
  categoryId: number;
  categoryName: string;
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  children: CustomerProgramCategoryNode[];
  products: CustomerProgramProduct[];
}

export interface CustomerProgramTree {
  categories: CustomerProgramCategoryNode[];
  categoryCount: number;
  productCount: number;
}

export interface CustomerProgramProductCandidate {
  productPk: number;
  title: string;
  productCode: string | null;
  skuCount: number;
  categoryName: string | null;
  brandName: string | null;
  basePrice: number | null;
  customerPrice: number | null;
}
