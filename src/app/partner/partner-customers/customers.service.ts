import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import { Customer, CustomerForm, CustomersPage } from './customer.model';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customers}`;

  async list(tpId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomersPage> {
    const data = await this.post({ action: '*LIST', tpId, ...params });
    return data as unknown as CustomersPage;
  }

  async get(tpId: number, custId: number): Promise<Customer> {
    const data = await this.post({ action: '*GET', tpId, custId });
    return data as unknown as Customer;
  }

  async create(tpId: number, form: CustomerForm): Promise<Customer> {
    const data = await this.post({ action: '*CREATE', tpId, ...form });
    return data['customer'] as unknown as Customer;
  }

  async update(tpId: number, custId: number, form: CustomerForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, custId, ...form });
  }

  async remove(tpId: number, custId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, custId });
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
