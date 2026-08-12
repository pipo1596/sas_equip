import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';
import { DataResidencyService } from '../../shared/data-residency.service';

@Component({
  selector: 'app-partner-settings-mfa',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-mfa.component.html',
})
export class PartnerSettingsMfaComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TpSettingsService);
  private readonly dataResidency = inject(DataResidencyService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  readonly checkingLock = signal(false);
  readonly regionLocked = signal(false);

  private savedRegion = 'CA';

  form: {
    mfa_reqd:    'Y' | 'N';
    ses_timeout: number;
    data_resid:  string;
  } = {
    mfa_reqd:    'N',
    ses_timeout: 60,
    data_resid:  'CA',
  };

  get mfaEnabled(): boolean {
    return this.form.mfa_reqd === 'Y';
  }
  set mfaEnabled(v: boolean) {
    this.form.mfa_reqd = v ? 'Y' : 'N';
  }

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.loading.set(true);
    try {
      const s = await this.service.get(tpId);
      this.form = {
        mfa_reqd:    s.mfa_reqd,
        ses_timeout: s.ses_timeout ?? 60,
        data_resid:  s.data_resid ?? 'CA',
      };
      this.savedRegion = this.form.data_resid;
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load security settings.');
    } finally {
      this.loading.set(false);
    }

    this.checkingLock.set(true);
    try {
      this.regionLocked.set(await this.dataResidency.hasEmployees(tpId));
    } catch {
      // Can't verify — fail safe and block the region change rather than risk orphaning data.
      this.regionLocked.set(true);
    } finally {
      this.checkingLock.set(false);
    }
  }

  async saveSecurity(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;

    if (this.regionLocked() && this.form.data_resid !== this.savedRegion) {
      // Defends against the disabled <select> being bypassed client-side —
      // restore the saved value rather than let a locked region change through.
      this.form.data_resid = this.savedRegion;
      this.saveError.set('Data residency region is locked and cannot be changed while this partner has existing customer employees.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.service.update('*UPD_SEC', tpId, this.form);
      this.dataResidency.set(tpId, this.form.data_resid.toUpperCase() === 'CA' ? 'CA' : 'US');
      this.savedRegion = this.form.data_resid;
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save security settings.');
    } finally {
      this.saving.set(false);
    }
  }
}
