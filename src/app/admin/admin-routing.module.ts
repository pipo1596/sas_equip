import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminComponent } from './admin/admin.component';
import { PlatformAdminsComponent } from './platform-admins/platform-admins.component';
import { PlatformAdminNewComponent } from './platform-admins/platform-admin-new.component';
import { PlatformAdminEditComponent } from './platform-admins/platform-admin-edit.component';
import { TenantPartnersComponent } from './tenant-partners/tenant-partners.component';

const routes: Routes = [
  { path: '', component: AdminComponent },
  { path: 'platform-admins', component: PlatformAdminsComponent },
  { path: 'platform-admins/new', component: PlatformAdminNewComponent },
  { path: 'platform-admins/:id/edit', component: PlatformAdminEditComponent },
  { path: 'tenant-partners', component: TenantPartnersComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
