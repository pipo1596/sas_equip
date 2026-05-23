import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminComponent } from './admin/admin.component';
import { PlatformAdminsComponent } from './platform-admins/platform-admins.component';
import { PlatformAdminFormComponent } from './platform-admins/platform-admin-form.component';
import { TenantPartnersComponent } from './tenant-partners/tenant-partners.component';
import { AuditLogComponent } from './audit-log/audit-log.component';

const routes: Routes = [
  { path: '', component: AdminComponent },
  { path: 'platform-admins', component: PlatformAdminsComponent },
  { path: 'platform-admins/new', component: PlatformAdminFormComponent },
  { path: 'platform-admins/:id/edit', component: PlatformAdminFormComponent },
  { path: 'tenant-partners', component: TenantPartnersComponent },
  { path: 'audit-log', component: AuditLogComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
