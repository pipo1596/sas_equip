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

export interface CustomerProgramSku {
  progProdId: number;
  progCatId: number;
  skuId: number;
  skuCode: string | null;
  productPk: number;
  productTitle: string;
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
  skus: CustomerProgramSku[];
}

export interface CustomerProgramTree {
  categories: CustomerProgramCategoryNode[];
  categoryCount: number;
  skuCount: number;
}

export interface CustomerProgramSkuCandidate {
  skuId: number;
  skuCode: string | null;
  productPk: number;
  productTitle: string;
  categoryName: string | null;
  brandName: string | null;
  basePrice: number | null;
  customerPrice: number | null;
}
