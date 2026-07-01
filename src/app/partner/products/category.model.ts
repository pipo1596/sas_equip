export interface Category {
  catId: number;
  tpId: number;
  catCode: string | null;
  catName: string;
  catSlug: string | null;
  catDescr: string | null;
  parentCatId: number | null;
  parentCatName?: string | null;
  imgUrl: string | null;
  activeFlag: 'Y' | 'N';
  sortOrder: number;
  level?: number;
  createdTs: string;
  updatedTs: string;
}

export interface CategoryForm {
  catCode: string;
  catName: string;
  catSlug: string;
  catDescr: string;
  parentCatId: number | null;
  imgUrl: string;
  activeFlag: 'Y' | 'N';
  sortOrder: number;
}

export interface CategoriesPage {
  data: Category[];
  pagination: { totalRows: number; page: number; pageSize: number };
}
