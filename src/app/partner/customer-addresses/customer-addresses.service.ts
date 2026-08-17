import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import { CustomerAddress, CustomerAddressForm } from './customer-address.model';

@Injectable({ providedIn: 'root' })
export class CustomerAddressesService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerAddresses}`;

  async list(tpId: number, custId: number): Promise<CustomerAddress[]> {
    const data = await this.post({ action: '*LIST_ALL', tpId, custId });
    return (data['data'] as unknown as CustomerAddress[]) ?? [];
  }

  async create(tpId: number, custId: number, form: CustomerAddressForm): Promise<CustomerAddress> {
    const data = await this.post({ action: '*CREATE', tpId, custId, ...form });
    return data['address'] as unknown as CustomerAddress;
  }

  async update(tpId: number, custId: number, addressId: number, form: CustomerAddressForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, custId, addressId, ...form });
  }

  async remove(tpId: number, custId: number, addressId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, custId, addressId });
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
