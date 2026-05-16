import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin/admin.component';
import { PlatformAdminsComponent } from './platform-admins/platform-admins.component';
import { TenantPartnersComponent } from './tenant-partners/tenant-partners.component';

@NgModule({
  imports: [CommonModule, RouterModule, AdminRoutingModule],
  declarations: [AdminComponent, PlatformAdminsComponent, TenantPartnersComponent],
})
export class AdminModule {}
