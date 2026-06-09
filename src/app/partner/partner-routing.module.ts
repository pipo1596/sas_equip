import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PartnerDashboardComponent } from './partner-dashboard/partner-dashboard.component';
import { PartnerProductsComponent } from './partner-products/partner-products.component';
import { PartnerUniformProgramsComponent } from './partner-uniform-programs/partner-uniform-programs.component';
import { PartnerRolesComponent } from './partner-roles/partner-roles.component';
import { PartnerCustomersComponent } from './partner-customers/partner-customers.component';
import { PartnerEmployeesComponent } from './partner-employees/partner-employees.component';
import { PartnerSettingsIdentityComponent } from './partner-settings-identity/partner-settings-identity.component';
import { PartnerSettingsAddressComponent } from './partner-settings-address/partner-settings-address.component';
import { PartnerSettingsPrimaryContactComponent } from './partner-settings-primary-contact/partner-settings-primary-contact.component';
import { PartnerSettingsMfaComponent } from './partner-settings-mfa/partner-settings-mfa.component';
import { PartnerSettingsStorefrontImagesComponent } from './partner-settings-storefront-images/partner-settings-storefront-images.component';
import { PartnerSettingsStorefrontFieldsComponent } from './partner-settings-storefront-fields/partner-settings-storefront-fields.component';
import { PartnerSettingsRecordMetadataComponent } from './partner-settings-record-metadata/partner-settings-record-metadata.component';

const routes: Routes = [
  { path: ':id/dashboard', component: PartnerDashboardComponent },
  { path: ':id/products', component: PartnerProductsComponent },
  { path: ':id/uniform-programs', component: PartnerUniformProgramsComponent },
  { path: ':id/roles', component: PartnerRolesComponent },
  { path: ':id/customers', component: PartnerCustomersComponent },
  { path: ':id/employees', component: PartnerEmployeesComponent },
  { path: ':id/settings', pathMatch: 'full', redirectTo: ({ params }) => `/partner/${params['id']}/settings/identity` },
  { path: ':id/settings/identity', component: PartnerSettingsIdentityComponent },
  { path: ':id/settings/address', component: PartnerSettingsAddressComponent },
  { path: ':id/settings/primary-contact', component: PartnerSettingsPrimaryContactComponent },
  { path: ':id/settings/mfa', component: PartnerSettingsMfaComponent },
  { path: ':id/settings/storefront-images', component: PartnerSettingsStorefrontImagesComponent },
  { path: ':id/settings/storefront-fields', component: PartnerSettingsStorefrontFieldsComponent },
  { path: ':id/settings/record-metadata', component: PartnerSettingsRecordMetadataComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PartnerRoutingModule {}
