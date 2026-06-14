import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';
import { ImageUploadService } from '../../shared/image-upload.service';

@Component({
  selector: 'app-partner-settings-branding',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-branding.component.html',
})
export class PartnerSettingsBrandingComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TpSettingsService);
  private readonly uploadService = inject(ImageUploadService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly uploadingField = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);

  form = {
    logo_url:     '',
    sup_logo_url: '',
    login_img:    '',
    hero_img:     '',
    men_clth_im:  '',
    men_ftw_im:   '',
    men_gear_im:  '',
  };

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.loading.set(true);
    try {
      const s = await this.service.get(tpId);
      this.form = {
        logo_url:     s.logo_url     ?? '',
        sup_logo_url: s.sup_logo_url ?? '',
        login_img:    s.login_img    ?? '',
        hero_img:     s.hero_img     ?? '',
        men_clth_im:  s.men_clth_im  ?? '',
        men_ftw_im:   s.men_ftw_im   ?? '',
        men_gear_im:  s.men_gear_im  ?? '',
      };
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load branding settings.');
    } finally {
      this.loading.set(false);
    }
  }

  async onFileSelected(event: Event, fieldName: keyof typeof this.form): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;

    this.uploadingField.set(fieldName);
    this.uploadError.set(null);
    try {
      const url = await this.uploadService.upload(fieldName, file, tpId, { tpId: tpId });
      this.form[fieldName] = url;
    } catch (err) {
      this.uploadError.set(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      this.uploadingField.set(null);
    }
  }

  async save(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.service.update('*UPD_BRAND', tpId, this.form);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save branding settings.');
    } finally {
      this.saving.set(false);
    }
  }
}
