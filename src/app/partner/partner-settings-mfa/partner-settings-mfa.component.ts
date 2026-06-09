import { Component, OnInit, inject, signal } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';
import { TenantPartnersService } from '../../admin/tenant-partners/tenant-partners.service';
import { TenantPartner } from '../../admin/tenant-partners/tenant-partner.model';

@Component({
  selector: 'app-partner-settings-mfa',
  standalone: true,
  templateUrl: './partner-settings-mfa.component.html',
})
export class PartnerSettingsMfaComponent implements OnInit {
  private readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TenantPartnersService);

  readonly partner = signal<TenantPartner | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.partnerMode.activePartner()?.tpId;
    if (!id) return;
    this.loading.set(true);
    try {
      this.partner.set(await this.service.get(id));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load partner details.');
    } finally {
      this.loading.set(false);
    }
  }
}
