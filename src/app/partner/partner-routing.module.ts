import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PartnerSettingsComponent } from './partner-settings/partner-settings.component';
import { PartnerProductsComponent } from './partner-products/partner-products.component';
import { PartnerUniformProgramsComponent } from './partner-uniform-programs/partner-uniform-programs.component';
import { PartnerRolesComponent } from './partner-roles/partner-roles.component';

const routes: Routes = [
  { path: ':id/settings', component: PartnerSettingsComponent },
  { path: ':id/products', component: PartnerProductsComponent },
  { path: ':id/uniform-programs', component: PartnerUniformProgramsComponent },
  { path: ':id/roles', component: PartnerRolesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PartnerRoutingModule {}
