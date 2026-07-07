import { Routes } from '@angular/router';
import { ProductsListComponent } from './products-list.component';
import { ProductFormComponent } from './product-form.component';
import { ProductDetailComponent } from './product-detail.component';
import { ProductSkuDetailComponent } from './product-sku-detail.component';
import { BrandsComponent } from '../brands/brands.component';
import { BrandFormComponent } from '../brands/brand-form.component';
import { CategoriesComponent } from '../categories/categories.component';
import { CategoryFormComponent } from '../categories/category-form.component';

// All routes are relative to partner/:id/products
export const PRODUCT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: ProductsListComponent },
  { path: 'new', component: ProductFormComponent },
  { path: 'brands', component: BrandsComponent },
  { path: 'brands/new', component: BrandFormComponent },
  { path: 'brands/:brandId/edit', component: BrandFormComponent },
  { path: 'categories', component: CategoriesComponent },
  { path: 'categories/new', component: CategoryFormComponent },
  { path: 'categories/:categoryId/edit', component: CategoryFormComponent },
  { path: ':productId', component: ProductDetailComponent },
  { path: ':productId/skus/new', component: ProductSkuDetailComponent },
  { path: ':productId/skus/:skuId', component: ProductSkuDetailComponent },
];
