import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';

@Component({
  selector: 'app-partner-settings-admin-contact',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-admin-contact.component.html',
})
export class PartnerSettingsAdminContactComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TpSettingsService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly emailTouched = signal(false);
  readonly phoneTouched = signal(false);

  form = { adm_ct_eml: '', adm_ct_phn: '' };

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.loading.set(true);
    try {
      const s = await this.service.get(tpId);
      this.form = {
        adm_ct_eml: s.adm_ct_eml ?? '',
        adm_ct_phn: s.adm_ct_phn ?? '',
      };
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load admin contact.');
    } finally {
      this.loading.set(false);
    }
  }

  isValidEmail(email: string): boolean {
    return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isValidPhone(phone: string): boolean {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = (input.value.slice(0, cursor).match(/\d/g) ?? []).length;

    const formatted = this.formatPhone(input.value);
    this.form.adm_ct_phn = formatted;
    input.value = formatted;

    let digitsSeen = 0;
    let newCursor = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (digitsSeen === digitsBeforeCursor) { newCursor = i; break; }
      if (/\d/.test(formatted[i])) digitsSeen++;
    }
    input.setSelectionRange(newCursor, newCursor);
  }

  private formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length === 11 && digits[0] === '1') {
      const d = digits.slice(1);
      return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    }
    const d = digits.slice(0, 10);
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  async save(): Promise<void> {
    this.emailTouched.set(true);
    this.phoneTouched.set(true);
    if (!this.isValidEmail(this.form.adm_ct_eml)) return;
    if (!this.isValidPhone(this.form.adm_ct_phn)) return;

    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.service.update('*UPD_ADMCNT', tpId, this.form);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save admin contact.');
    } finally {
      this.saving.set(false);
    }
  }
}
