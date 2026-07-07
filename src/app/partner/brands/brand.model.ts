export interface Brand {
  brandId: number;
  tpId: number;
  brandName: string;
  brandSlug: string | null;
  brandDescr: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  supplierCode: string | null;
  manufacturerId: string | null;
  bcBrandId: number | null;
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface BrandForm {
  brandName: string;
  brandSlug: string;
  brandDescr: string;
  logoUrl: string;
  websiteUrl: string;
  status: 'ACTIVE' | 'INACTIVE';
  supplierCode: string;
  manufacturerId: string;
  bcBrandId: number | null;
}

export interface BrandsPage {
  data: Brand[];
  pagination: { totalRows: number; page: number; pageSize: number };
}
