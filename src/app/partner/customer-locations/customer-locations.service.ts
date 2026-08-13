import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import { CustomerLocation, CustomerLocationForm, CustomerLocationsPage } from './customer-location.model';

@Injectable({ providedIn: 'root' })
export class CustomerLocationsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerLocations}`;

  async list(tpId: number, custId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomerLocationsPage> {
    const data = await this.post({ action: '*LIST', tpId, custId, ...params });
    return data as unknown as CustomerLocationsPage;
  }

  async listAll(tpId: number, custId: number): Promise<CustomerLocation[]> {
    const data = await this.post({ action: '*LIST_ALL', tpId, custId });
    return (data['data'] as unknown as CustomerLocation[]) ?? [];
  }

  async get(tpId: number, custId: number, locId: number): Promise<CustomerLocation> {
    const data = await this.post({ action: '*GET', tpId, custId, locId });
    return data as unknown as CustomerLocation;
  }

  async create(tpId: number, custId: number, form: CustomerLocationForm): Promise<CustomerLocation> {
    const data = await this.post({ action: '*CREATE', tpId, custId, ...form });
    return data['location'] as unknown as CustomerLocation;
  }

  async update(tpId: number, custId: number, locId: number, form: CustomerLocationForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, custId, locId, ...form });
  }

  async remove(tpId: number, custId: number, locId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, custId, locId });
  }

  private async post(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message'] ?? 'Request failed.'));
    }
    return data;
  }

  private async parseJson(response: Response): Promise<Record<string, unknown>> {
    try {
      return repairCp1252MojibakeDeep(JSON.parse(await decodeWindows1252Text(response)) as Record<string, unknown>);
    } catch {
      return { success: false, message: 'Invalid server response.' };
    }
  }
}
