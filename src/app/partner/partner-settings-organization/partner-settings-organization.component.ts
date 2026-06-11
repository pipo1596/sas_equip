import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TpSettingsService } from '../../shared/tp-settings.service';

@Component({
  selector: 'app-partner-settings-organization',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-organization.component.html',
})
export class PartnerSettingsOrganizationComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TpSettingsService);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  readonly months = [
    { value: 1,  label: 'January'   }, { value: 2,  label: 'February'  },
    { value: 3,  label: 'March'     }, { value: 4,  label: 'April'     },
    { value: 5,  label: 'May'       }, { value: 6,  label: 'June'      },
    { value: 7,  label: 'July'      }, { value: 8,  label: 'August'    },
    { value: 9,  label: 'September' }, { value: 10, label: 'October'   },
    { value: 11, label: 'November'  }, { value: 12, label: 'December'  },
  ];

  form: {
    comp_name:  string;
    dflt_lang:  string;
    bilng_mode: 'Y' | 'N';
    timezone:   string;
    currency:   string;
    fisc_yr_mo: number;
  } = {
    comp_name:  '',
    dflt_lang:  'EN',
    bilng_mode: 'N',
    timezone:   'America/New_York',
    currency:   'USD',
    fisc_yr_mo: 1,
  };

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    if (!tpId) return;
    this.loading.set(true);
    try {
      const s = await this.service.get(tpId);
      this.form = {
        comp_name:  s.comp_name  ?? '',
        dflt_lang:  s.dflt_lang,
        bilng_mode: s.bilng_mode,
        timezone:   s.timezone,
        currency:   s.currency,
        fisc_yr_mo: s.fisc_yr_mo,
      };
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load organization details.');
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
      await this.service.update('*UPD_ORG', tpId, this.form);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save organization details.');
    } finally {
      this.saving.set(false);
    }
  }
}
