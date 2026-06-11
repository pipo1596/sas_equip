import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';

@Component({
  selector: 'app-partner-settings-support-contact',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-support-contact.component.html',
})
export class PartnerSettingsSupportContactComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TpSettingsService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly emailTouched = signal(false);

  form = { supprt_name: '', supprt_eml: '' };

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.loading.set(true);
    try {
      const s = await this.service.get(tpId);
      this.form = {
        supprt_name: s.supprt_name ?? '',
        supprt_eml:  s.supprt_eml  ?? '',
      };
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load support contact.');
    } finally {
      this.loading.set(false);
    }
  }

  isValidEmail(email: string): boolean {
    return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async save(): Promise<void> {
    this.emailTouched.set(true);
    if (!this.isValidEmail(this.form.supprt_eml)) return;

    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.service.update('*UPD_SUPCNT', tpId, this.form);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save support contact.');
    } finally {
      this.saving.set(false);
    }
  }
}
