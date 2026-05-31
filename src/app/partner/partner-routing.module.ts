import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PartnerSettingsComponent } from './partner-settings/partner-settings.component';

const routes: Routes = [
  { path: ':id/settings', component: PartnerSettingsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PartnerRoutingModule {}
