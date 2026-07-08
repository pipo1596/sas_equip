import { Routes } from '@angular/router';
import { PartnerDashboardComponent } from './partner-dashboard/partner-dashboard.component';
import { PartnerUniformProgramsComponent } from './partner-uniform-programs/partner-uniform-programs.component';
import { PartnerRolesComponent } from './partner-roles/partner-roles.component';
import { PartnerCustomersComponent } from './partner-customers/partner-customers.component';
import { PartnerEmployeesComponent } from './partner-employees/partner-employees.component';

export const PARTNER_ROUTES: Routes = [
  { path: ':id/dashboard', component: PartnerDashboardComponent },

  // ── Products (brands + categories + catalog — one shared chunk) ────────────
  {
    path: ':id/products',
    loadChildren: () => import('./products/products.routes').then(m => m.PRODUCT_ROUTES),
  },

  { path: ':id/uniform-programs', component: PartnerUniformProgramsComponent },
  { path: ':id/roles', component: PartnerRolesComponent },
  { path: ':id/customers', component: PartnerCustomersComponent },
  { path: ':id/employees', component: PartnerEmployeesComponent },

  // ── Settings + users (one shared chunk) ────────────────────────────────────
  {
    path: ':id/settings',
    loadChildren: () => import('./settings/settings.routes').then(m => m.SETTINGS_ROUTES),
  },
];
