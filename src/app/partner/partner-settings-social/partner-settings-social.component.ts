import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';

@Component({
  selector: 'app-partner-settings-social',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-social.component.html',
  styles: [`
    .social-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid #f0f0f0;
    }
    .social-row:last-child { border-bottom: none; }
    .social-icon {
      width: 42px; height: 42px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .social-label { min-width: 130px; flex-shrink: 0; }
    .social-label .name { font-weight: 600; font-size: 0.9rem; margin-bottom: 0; }
    .social-label .base-url { font-size: 0.75rem; color: #999; margin-bottom: 0; }
    .social-input { flex: 1; }
    .social-input input {
      border: 1px solid #e8e8e8; border-radius: 8px; padding: 0.5rem 0.75rem;
      width: 100%; font-size: 0.875rem; transition: border-color 0.15s;
    }
    .social-input input:focus {
      outline: none; border-color: #86b7fe; box-shadow: 0 0 0 0.2rem rgba(13,110,253,.15);
    }
    .social-input input::placeholder { color: #c0c0c0; }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .status-dot.active { background: #22c55e; }
    .status-dot.inactive { background: #d4d4d4; }
    .link-btn {
      width: 36px; height: 36px; border-radius: 8px; border: 1px solid #e8e8e8;
      background: #fff; display: flex; align-items: center; justify-content: center;
      color: #999; text-decoration: none; flex-shrink: 0; transition: all 0.15s;
    }
    .link-btn:hover:not(.disabled) { border-color: #c0c0c0; color: #333; }
    .link-btn.disabled { opacity: 0.4; pointer-events: none; }
  `],
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

  get connectedCount(): number {
    return Object.values(this.form).filter(v => !!v).length;
  }

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
