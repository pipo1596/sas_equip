import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from './cp1252-mojibake.util';
import { TpSettingsService } from './tp-settings.service';

export type DataResidencyRegion = 'US' | 'CA';

@Injectable({ providedIn: 'root' })
export class DataResidencyService {
  private readonly tpSettingsService = inject(TpSettingsService);
  private readonly cache = new Map<number, DataResidencyRegion>();

  private readonly lockCheckEndpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerEmployeesLockCheck}`;

  // Cached per tpId so every customer-employees call doesn't re-fetch the full
  // tenant partner settings. Call set() after saving the security settings
  // (partner-settings-mfa.component.ts) so an in-session region change is
  // picked up immediately instead of only after a hard reload.
  async resolve(tpId: number): Promise<DataResidencyRegion> {
    const cached = this.cache.get(tpId);
    if (cached) return cached;
    const settings = await this.tpSettingsService.get(tpId);
    const region: DataResidencyRegion = settings.data_resid?.toUpperCase() === 'CA' ? 'CA' : 'US';
    this.cache.set(tpId, region);
    return region;
  }

  set(tpId: number, region: DataResidencyRegion): void {
    this.cache.set(tpId, region);
  }

  // True if this partner already has customer-employee records — switching
  // regions would orphan them, since APITPCEMP/APITPCEMCA are separate
  // regional stores, not two routes to the same data.
  async hasEmployees(tpId: number): Promise<boolean> {
    const response = await fetch(this.lockCheckEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*HAS_EMPLOYEES', tpId }),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Could not verify data residency lock status.');
    }
    const data = repairCp1252MojibakeDeep(
      JSON.parse(await decodeWindows1252Text(response)) as Record<string, unknown>,
    );
    return Boolean(data['locked']);
  }
}
