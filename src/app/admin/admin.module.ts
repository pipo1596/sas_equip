import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin/admin.component';
import { PlatformAdminsComponent } from './platform-admins/platform-admins.component';
import { PlatformAdminFormComponent } from './platform-admins/platform-admin-form.component';
import { TenantPartnersComponent } from './tenant-partners/tenant-partners.component';
import { AuditLogComponent } from './audit-log/audit-log.component';

@NgModule({
  imports: [CommonModule, RouterModule, FormsModule, AdminRoutingModule],
  declarations: [AdminComponent, PlatformAdminsComponent, PlatformAdminFormComponent, TenantPartnersComponent, AuditLogComponent],
})
export class AdminModule {}
