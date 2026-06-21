import { Component, OnInit, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { PartnerModeService } from '../partner-mode.service';
import { TenantPartnersService } from '../../admin/tenant-partners/tenant-partners.service';
import { TenantPartner } from '../../admin/tenant-partners/tenant-partner.model';
import { TpSettingsService } from '../../shared/tp-settings.service';
import { TpSettings } from '../../shared/tp-settings.model';

@Component({
  selector: 'app-partner-settings-identity',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './partner-settings-identity.component.html',
})
export class PartnerSettingsIdentityComponent implements OnInit {
  private readonly partnerMode = inject(PartnerModeService);
  private readonly partnerService = inject(TenantPartnersService);
  private readonly settingsService = inject(TpSettingsService);

  readonly partner = signal<TenantPartner | null>(null);
  readonly settings = signal<TpSettings | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.partnerMode.activePartner()?.tpId;
    if (!id) return;
    this.loading.set(true);
    try {
      const [p, s] = await Promise.all([
        this.partnerService.get(id),
        this.settingsService.get(id),
      ]);
      this.partner.set(p);
      this.settings.set(s);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load partner details.');
    } finally {
      this.loading.set(false);
    }
  }

  initials(name: string | null): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  cityLine(s: TpSettings): string {
    return [s.city, [s.province, s.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  }

  statusDotColor(status: string): string {
    switch (status) {
      case 'ACTIVE':    return '#198754';
      case 'INACTIVE':  return '#6c757d';
      case 'SUSPENDED': return '#ffc107';
      default:          return '#adb5bd';
    }
  }
}
