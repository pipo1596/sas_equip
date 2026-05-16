import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin/admin.component';
import { PlatformAdminsComponent } from './platform-admins/platform-admins.component';
import { PlatformAdminNewComponent } from './platform-admins/platform-admin-new.component';
import { PlatformAdminEditComponent } from './platform-admins/platform-admin-edit.component';
import { TenantPartnersComponent } from './tenant-partners/tenant-partners.component';

@NgModule({
  imports: [CommonModule, RouterModule, FormsModule, AdminRoutingModule],
  declarations: [AdminComponent, PlatformAdminsComponent, PlatformAdminNewComponent, PlatformAdminEditComponent, TenantPartnersComponent],
})
export class AdminModule {}
