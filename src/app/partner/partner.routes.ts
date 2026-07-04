import { Routes } from '@angular/router';

export const PARTNER_ROUTES: Routes = [
  {
    path: ':id/dashboard',
    loadComponent: () => import('./partner-dashboard/partner-dashboard.component').then(m => m.PartnerDashboardComponent),
  },

  // ── Products (brands + categories + catalog — one shared chunk) ────────────
  {
    path: ':id/products',
    loadChildren: () => import('./products/products.routes').then(m => m.PRODUCT_ROUTES),
  },

  // ── Other sections ─────────────────────────────────────────────────────────
  {
    path: ':id/uniform-programs',
    loadComponent: () => import('./partner-uniform-programs/partner-uniform-programs.component').then(m => m.PartnerUniformProgramsComponent),
  },
  {
    path: ':id/roles',
    loadComponent: () => import('./partner-roles/partner-roles.component').then(m => m.PartnerRolesComponent),
  },
  {
    path: ':id/customers',
    loadComponent: () => import('./partner-customers/partner-customers.component').then(m => m.PartnerCustomersComponent),
  },
  {
    path: ':id/employees',
    loadComponent: () => import('./partner-employees/partner-employees.component').then(m => m.PartnerEmployeesComponent),
  },

  // ── Settings + users (one shared chunk) ────────────────────────────────────
  {
    path: ':id/settings',
    loadChildren: () => import('./partner-settings.routes').then(m => m.SETTINGS_ROUTES),
  },
];
