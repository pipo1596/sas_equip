import { Routes } from '@angular/router';
import { PartnerCustomersComponent } from './partner-customers.component';
import { CustomerFormComponent } from './customer-form.component';

// All routes are relative to partner/:id/customers
export const CUSTOMERS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: PartnerCustomersComponent },
  { path: 'new', component: CustomerFormComponent },
  { path: ':customerId/edit', component: CustomerFormComponent },
];
