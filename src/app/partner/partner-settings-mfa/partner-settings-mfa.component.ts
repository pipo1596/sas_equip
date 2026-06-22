import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TenantPartnersService } from '../../admin/tenant-partners/tenant-partners.service';
import { TenantPartner } from '../../admin/tenant-partners/tenant-partner.model';

@Component({
  selector: 'app-partner-settings-mfa',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-mfa.component.html',
})
export class PartnerSettingsMfaComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TenantPartnersService);

  readonly partner = signal<TenantPartner | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  mfaEnabled = false;
  sessionTimeout = '60';

  dataResidency = 'azure-ca-central';

  async ngOnInit(): Promise<void> {
    const id = this.partnerMode.activePartner()?.tpId;
    if (!id) return;
    this.loading.set(true);
    try {
      const p = await this.service.get(id);
      this.partner.set(p);
      this.mfaEnabled = p.mfaRequired === 'Y';
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load partner details.');
    } finally {
      this.loading.set(false);
    }
  }

  async saveSecurity(): Promise<void> {
    const p = this.partner();
    if (!p) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.service.update(p.tpId, {
        tpName: p.tpName,
        tpStatus: p.tpStatus,
        loginDomain: p.loginDomain ?? '',
        portalBaseDomain: p.portalBaseDomain ?? '',
        mfaRequired: this.mfaEnabled ? 'Y' : 'N',
        adminContactEmail: p.adminContactEmail ?? '',
        adminContactPhone: p.adminContactPhone ?? '',
      });
      this.partner.set({ ...p, mfaRequired: this.mfaEnabled ? 'Y' : 'N' });
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save security settings.');
    } finally {
      this.saving.set(false);
    }
  }
}
