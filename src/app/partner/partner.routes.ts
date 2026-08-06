import { Routes } from '@angular/router';
import { PartnerDashboardComponent } from './partner-dashboard/partner-dashboard.component';

export const PARTNER_ROUTES: Routes = [
  { path: ':id/dashboard', component: PartnerDashboardComponent },

  // ── Products (brands + categories + catalog — one shared chunk) ────────────
  {
    path: ':id/products',
    loadChildren: () => import('./products/products.routes').then(m => m.PRODUCT_ROUTES),
  },

  // ── Customers (list + form + per-customer Uniform Programs/Roles/Employees — one shared chunk) ──
  {
    path: ':id/customers',
    loadChildren: () => import('./partner-customers/customers.routes').then(m => m.CUSTOMERS_ROUTES),
  },

  // ── Settings + users (one shared chunk) ────────────────────────────────────
  {
    path: ':id/settings',
    loadChildren: () => import('./settings/settings.routes').then(m => m.SETTINGS_ROUTES),
  },
];
