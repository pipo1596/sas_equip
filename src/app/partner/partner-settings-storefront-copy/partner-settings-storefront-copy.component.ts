import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';

@Component({
  selector: 'app-partner-settings-storefront-copy',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-storefront-copy.component.html',
})
export class PartnerSettingsStorefrontCopyComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TpSettingsService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  form = {
    welcom_copy: '',
    alert_copy:  '',
    hero_copy:   '',
    shop_copy:   '',
    botm_copy:   '',
    copyrg_txt:  '',
  };

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.loading.set(true);
    try {
      const s = await this.service.get(tpId);
      this.form = {
        welcom_copy: s.welcom_copy ?? '',
        alert_copy:  s.alert_copy  ?? '',
        hero_copy:   s.hero_copy   ?? '',
        shop_copy:   s.shop_copy   ?? '',
        botm_copy:   s.botm_copy   ?? '',
        copyrg_txt:  s.copyrg_txt  ?? '',
      };
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load storefront copy.');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.service.update('*UPD_COPY', tpId, this.form);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save storefront copy.');
    } finally {
      this.saving.set(false);
    }
  }
}
