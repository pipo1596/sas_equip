import { Routes } from '@angular/router';

// All routes are relative to partner/:id/products
export const PRODUCT_ROUTES: Routes = [
  // Static paths must come before the :productId wildcard
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('../partner-products/partner-products.component').then(m => m.PartnerProductsComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./product-form.component').then(m => m.ProductFormComponent),
  },
  {
    path: 'brands',
    loadComponent: () => import('./brands.component').then(m => m.BrandsComponent),
  },
  {
    path: 'brands/new',
    loadComponent: () => import('./brand-form.component').then(m => m.BrandFormComponent),
  },
  {
    path: 'brands/:brandId/edit',
    loadComponent: () => import('./brand-form.component').then(m => m.BrandFormComponent),
  },
  {
    path: 'categories',
    loadComponent: () => import('./categories.component').then(m => m.CategoriesComponent),
  },
  {
    path: 'categories/new',
    loadComponent: () => import('./category-form.component').then(m => m.CategoryFormComponent),
  },
  {
    path: 'categories/:categoryId/edit',
    loadComponent: () => import('./category-form.component').then(m => m.CategoryFormComponent),
  },
  {
    path: ':productId',
    loadComponent: () => import('./product-detail.component').then(m => m.ProductDetailComponent),
  },
  {
    path: ':productId/skus/new',
    loadComponent: () => import('./product-sku-detail.component').then(m => m.ProductSkuDetailComponent),
  },
  {
    path: ':productId/skus/:skuId',
    loadComponent: () => import('./product-sku-detail.component').then(m => m.ProductSkuDetailComponent),
  },
];
