import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';

@Component({
  selector: 'app-partner-settings-contacts',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-contacts.component.html',
})
export class PartnerSettingsContactsComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TpSettingsService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly savingPrimary = signal(false);
  readonly saveErrorPrimary = signal<string | null>(null);
  readonly saveSuccessPrimary = signal(false);
  readonly primaryEmailTouched = signal(false);
  readonly primaryPhoneTouched = signal(false);

  readonly savingAdmin = signal(false);
  readonly saveErrorAdmin = signal<string | null>(null);
  readonly saveSuccessAdmin = signal(false);
  readonly adminEmailTouched = signal(false);
  readonly adminPhoneTouched = signal(false);

  readonly savingSupport = signal(false);
  readonly saveErrorSupport = signal<string | null>(null);
  readonly saveSuccessSupport = signal(false);
  readonly supportEmailTouched = signal(false);

  primaryForm = { cont_name: '', pric_eml: '', pric_phn: '' };
  adminForm   = { adm_ct_eml: '', adm_ct_phn: '' };
  supportForm = { supprt_name: '', supprt_eml: '' };

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.loading.set(true);
    try {
      const s = await this.service.get(tpId);
      this.primaryForm = { cont_name: s.cont_name ?? '', pric_eml: s.pric_eml ?? '', pric_phn: s.pric_phn ?? '' };
      this.adminForm   = { adm_ct_eml: s.adm_ct_eml ?? '', adm_ct_phn: s.adm_ct_phn ?? '' };
      this.supportForm = { supprt_name: s.supprt_name ?? '', supprt_eml: s.supprt_eml ?? '' };
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load contacts.');
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

  private applyPhoneInput(event: Event, setter: (v: string) => void): void {
    const input = event.target as HTMLInputElement;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = (input.value.slice(0, cursor).match(/\d/g) ?? []).length;
    const formatted = this.formatPhone(input.value);
    setter(formatted);
    input.value = formatted;
    let digitsSeen = 0;
    let newCursor = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (digitsSeen === digitsBeforeCursor) { newCursor = i; break; }
      if (/\d/.test(formatted[i])) digitsSeen++;
    }
    input.setSelectionRange(newCursor, newCursor);
  }

  onPrimaryPhoneInput(event: Event): void {
    this.applyPhoneInput(event, v => this.primaryForm.pric_phn = v);
  }

  onAdminPhoneInput(event: Event): void {
    this.applyPhoneInput(event, v => this.adminForm.adm_ct_phn = v);
  }

  async savePrimary(): Promise<void> {
    this.primaryEmailTouched.set(true);
    this.primaryPhoneTouched.set(true);
    if (!this.isValidEmail(this.primaryForm.pric_eml)) return;
    if (!this.isValidPhone(this.primaryForm.pric_phn)) return;
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.savingPrimary.set(true);
    this.saveErrorPrimary.set(null);
    this.saveSuccessPrimary.set(false);
    try {
      await this.service.update('*UPD_PRICNT', tpId, this.primaryForm);
      this.saveSuccessPrimary.set(true);
      setTimeout(() => this.saveSuccessPrimary.set(false), 3000);
    } catch (err) {
      this.saveErrorPrimary.set(err instanceof Error ? err.message : 'Failed to save primary contact.');
    } finally {
      this.savingPrimary.set(false);
    }
  }

  async saveAdmin(): Promise<void> {
    this.adminEmailTouched.set(true);
    this.adminPhoneTouched.set(true);
    if (!this.isValidEmail(this.adminForm.adm_ct_eml)) return;
    if (!this.isValidPhone(this.adminForm.adm_ct_phn)) return;
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.savingAdmin.set(true);
    this.saveErrorAdmin.set(null);
    this.saveSuccessAdmin.set(false);
    try {
      await this.service.update('*UPD_ADMCNT', tpId, this.adminForm);
      this.saveSuccessAdmin.set(true);
      setTimeout(() => this.saveSuccessAdmin.set(false), 3000);
    } catch (err) {
      this.saveErrorAdmin.set(err instanceof Error ? err.message : 'Failed to save admin contact.');
    } finally {
      this.savingAdmin.set(false);
    }
  }

  async saveSupport(): Promise<void> {
    this.supportEmailTouched.set(true);
    if (!this.isValidEmail(this.supportForm.supprt_eml)) return;
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.savingSupport.set(true);
    this.saveErrorSupport.set(null);
    this.saveSuccessSupport.set(false);
    try {
      await this.service.update('*UPD_SUPCNT', tpId, this.supportForm);
      this.saveSuccessSupport.set(true);
      setTimeout(() => this.saveSuccessSupport.set(false), 3000);
    } catch (err) {
      this.saveErrorSupport.set(err instanceof Error ? err.message : 'Failed to save support contact.');
    } finally {
      this.savingSupport.set(false);
    }
  }
}
