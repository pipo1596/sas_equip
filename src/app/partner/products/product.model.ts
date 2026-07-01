export interface Product {
  productId: number;
  tpId: number;
  brandId: number | null;
  brandName?: string | null;
  handle: string;
  title: string;
  descr: string | null;
  vendor: string | null;
  tags: string | null;
  pageTitle: string | null;
  seoDescr: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  publishedAt: string | null;
  notes: string | null;
  skuCount?: number;
  thumbnailUrl?: string | null;
  primaryCategoryName?: string | null;
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | null;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface ProductForm {
  brandId: number | null;
  handle: string;
  title: string;
  descr: string;
  vendor: string;
  tags: string;
  pageTitle: string;
  seoDescr: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  notes: string;
}

export interface ProductSku {
  skuId: number;
  productId: number;
  tpId: number;
  skuCode: string;
  skuTitle: string | null;
  upc: string | null;
  basePrice: number | null;
  comparePrice: number | null;
  costPrice: number | null;
  weight: number | null;
  weightUnit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  dimUnit: string | null;
  countryOrigin: string | null;
  htsCode: string | null;
  hazmatFlag: 'Y' | 'N';
  fulfillmentType: string | null;
  isBackorderable: 'Y' | 'N';
  maxBackorderQty: number | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  sortOrder: number;
  options?: ProductOption[];
  createdTs: string;
  updatedTs: string;
}

export interface ProductSkuForm {
  skuCode: string;
  skuTitle: string;
  upc: string;
  basePrice: number | null;
  comparePrice: number | null;
  costPrice: number | null;
  weight: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimUnit: string;
  countryOrigin: string;
  htsCode: string;
  hazmatFlag: 'Y' | 'N';
  fulfillmentType: string;
  isBackorderable: 'Y' | 'N';
  maxBackorderQty: number | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  sortOrder: number;
}

export interface ProductOption {
  optId?: number;
  skuId: number;
  productId: number;
  tpId: number;
  optName: string;
  optValue: string;
  sortOrder: number;
  createdTs?: string;
}

export interface ProductImage {
  imgId: number;
  productId: number;
  skuId: number | null;
  tpId: number;
  imgUrl: string;
  imgAlt: string | null;
  sortOrder: number;
  isThumbnail: 'Y' | 'N';
  createdTs: string;
  createdBy: string | null;
}

export interface ProductAttribute {
  attrId: number;
  productId: number;
  skuId: number | null;
  tpId: number;
  attrKey: string;
  attrValue: string | null;
  attrType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'URL' | 'JSON';
  isVisible: 'Y' | 'N';
  isSearchable: 'Y' | 'N';
  sortOrder: number;
  createdTs: string;
}

export interface ProductInventory {
  invId: number;
  skuId: number;
  tpId: number;
  warehouseId: number;
  warehouseName?: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
  reorderPoint: number | null;
  reorderQty: number | null;
  trackInventory: 'Y' | 'N';
  allowBackorder: 'Y' | 'N';
  updatedTs: string;
  updatedBy: string | null;
}

export interface ProductPricing {
  priceId: number;
  skuId: number;
  tpId: number;
  channelId: number | null;
  marketId: number | null;
  currencyCd: string;
  priceAmount: number;
  compareAmount: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: 'Y' | 'N';
  createdTs: string;
  updatedTs: string;
}

export interface ProductCategoryAssignment {
  productId: number;
  catId: number;
  tpId: number;
  isPrimary: 'Y' | 'N';
  sortOrder: number;
  catName?: string;
  createdTs: string;
  createdBy: string | null;
}

export interface ProductXref {
  xrefId: number;
  productId: number;
  skuId: number | null;
  tpId: number;
  platformCd: string;
  extProductId: string | null;
  extSkuId: string | null;
  extUrl: string | null;
  syncStatus: string | null;
  lastSyncTs: string | null;
  createdTs: string;
}

export interface ProductSummary {
  totalProducts: number;
  activeCount: number;
  draftCount: number;
  archivedCount: number;
  totalSkus: number;
  outOfStockCount: number;
}

export interface ProductsPage {
  data: Product[];
  pagination: { totalRows: number; page: number; pageSize: number };
  summary?: ProductSummary;
}

export interface SkusPage {
  data: ProductSku[];
  pagination: { totalRows: number; page: number; pageSize: number };
}
