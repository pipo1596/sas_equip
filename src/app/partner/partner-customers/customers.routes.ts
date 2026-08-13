import { Routes } from '@angular/router';
import { PartnerCustomersComponent } from './partner-customers.component';
import { CustomerFormComponent } from './customer-form.component';
import { PartnerUniformProgramsComponent } from '../partner-uniform-programs/partner-uniform-programs.component';
import { PartnerRolesComponent } from '../partner-roles/partner-roles.component';
import { CustomerEmployeesComponent } from '../customer-employees/customer-employees.component';
import { CustomerEmployeeFormComponent } from '../customer-employees/customer-employee-form.component';
import { CustomerLocationsComponent } from '../customer-locations/customer-locations.component';
import { CustomerLocationFormComponent } from '../customer-locations/customer-location-form.component';

// All routes are relative to partner/:id/customers
export const CUSTOMERS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: PartnerCustomersComponent },
  { path: 'new', component: CustomerFormComponent },
  { path: ':customerId/edit', component: CustomerFormComponent },
  { path: ':customerId', pathMatch: 'full', redirectTo: ':customerId/uniform-programs' },
  { path: ':customerId/uniform-programs', component: PartnerUniformProgramsComponent },
  { path: ':customerId/roles', component: PartnerRolesComponent },
  { path: ':customerId/employees', component: CustomerEmployeesComponent },
  { path: ':customerId/employees/new', component: CustomerEmployeeFormComponent },
  { path: ':customerId/employees/:employeeId/edit', component: CustomerEmployeeFormComponent },
  { path: ':customerId/locations', component: CustomerLocationsComponent },
  { path: ':customerId/locations/new', component: CustomerLocationFormComponent },
  { path: ':customerId/locations/:locationId/edit', component: CustomerLocationFormComponent },
];
