import { Routes } from '@angular/router';
import { PartnerCustomersComponent } from './partner-customers.component';
import { CustomerFormComponent } from './customer-form.component';
import { PartnerUniformProgramsComponent } from '../partner-uniform-programs/partner-uniform-programs.component';
import { CustomerRolesComponent } from '../customer-roles/customer-roles.component';
import { CustomerRoleFormComponent } from '../customer-roles/customer-role-form.component';
import { CustomerEmployeesComponent } from '../customer-employees/customer-employees.component';
import { CustomerEmployeeFormComponent } from '../customer-employees/customer-employee-form.component';
import { CustomerLocationsComponent } from '../customer-locations/customer-locations.component';
import { CustomerLocationFormComponent } from '../customer-locations/customer-location-form.component';
import { CustomerAddressesComponent } from '../customer-addresses/customer-addresses.component';
import { CustomerContactsComponent } from '../customer-contacts/customer-contacts.component';

// All routes are relative to partner/:id/customers
export const CUSTOMERS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: PartnerCustomersComponent },
  { path: 'new', component: CustomerFormComponent },
  { path: ':customerId/edit', component: CustomerFormComponent },
  { path: ':customerId', pathMatch: 'full', redirectTo: ':customerId/uniform-programs' },
  { path: ':customerId/uniform-programs', component: PartnerUniformProgramsComponent },
  { path: ':customerId/roles', component: CustomerRolesComponent },
  { path: ':customerId/roles/new', component: CustomerRoleFormComponent },
  { path: ':customerId/roles/:roleId/edit', component: CustomerRoleFormComponent },
  { path: ':customerId/employees', component: CustomerEmployeesComponent },
  { path: ':customerId/employees/new', component: CustomerEmployeeFormComponent },
  { path: ':customerId/employees/:employeeId/edit', component: CustomerEmployeeFormComponent },
  { path: ':customerId/locations', component: CustomerLocationsComponent },
  { path: ':customerId/locations/new', component: CustomerLocationFormComponent },
  { path: ':customerId/locations/:locationId/edit', component: CustomerLocationFormComponent },
  { path: ':customerId/addresses', component: CustomerAddressesComponent },
  { path: ':customerId/contacts', component: CustomerContactsComponent },
];
