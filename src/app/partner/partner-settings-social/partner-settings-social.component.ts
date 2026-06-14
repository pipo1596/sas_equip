import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';

@Component({
  selector: 'app-partner-settings-social',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-social.component.html',
})
export class PartnerSettingsSocialComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TpSettingsService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  form = {
    instag_url: '',
    facebk_url: '',
    youtub_url: '',
    linkdin_url: '',
    twiter_url: '',
    shopng_url: '',
  };

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.loading.set(true);
    try {
      const s = await this.service.get(tpId);
      this.form = {
        instag_url:  s.instag_url  ?? '',
        facebk_url:  s.facebk_url  ?? '',
        youtub_url:  s.youtub_url  ?? '',
        linkdin_url: s.linkdin_url ?? '',
        twiter_url:  s.twiter_url  ?? '',
        shopng_url:  s.shopng_url  ?? '',
      };
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load social links.');
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
      await this.service.update('*UPD_SOCIAL', tpId, this.form);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save social links.');
    } finally {
      this.saving.set(false);
    }
  }
}
