import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PlatformAdminsComponent } from './platform-admins/platform-admins.component';
import { PlatformAdminFormComponent } from './platform-admins/platform-admin-form.component';
import { TenantPartnersComponent } from './tenant-partners/tenant-partners.component';
import { TenantPartnerFormComponent } from './tenant-partners/tenant-partner-form.component';
import { AuditLogComponent } from './audit-log/audit-log.component';

@NgModule({
  imports: [CommonModule, RouterModule, FormsModule, AdminRoutingModule],
  declarations: [DashboardComponent, PlatformAdminsComponent, PlatformAdminFormComponent, TenantPartnersComponent, TenantPartnerFormComponent, AuditLogComponent],
})
export class AdminModule {}
