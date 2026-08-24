export interface CustomerPriceList {
  priceListId: number;
  tpId: number;
  custId: number;
  listName: string;
  versionCode: string;
  currency: 'USD' | 'CAD';
  effectiveDate: string;
  endDate: string | null;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  itemCount?: number;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface CustomerPriceListForm {
  listName: string;
  versionCode: string;
  currency: 'USD' | 'CAD';
  effectiveDate: string;
  endDate: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
}

export interface CustomerPriceListsPage {
  data: CustomerPriceList[];
  pagination: { totalRows: number; page: number; pageSize: number };
}

export interface CustomerPriceListItem {
  itemId: number;
  priceListId: number;
  skuId: number;
  skuCode: string | null;
  productTitle: string | null;
  price: number;
  compareAtPrc: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface CustomerPriceListItemForm {
  skuId: number | null;
  price: number | null;
  compareAtPrc: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CustomerPriceListItemsPage {
  data: CustomerPriceListItem[];
  pagination: { totalRows: number; page: number; pageSize: number };
}

export interface SkuSearchResult {
  skuId: number;
  skuCode: string;
  productTitle: string;
  basePrice: number;
}
