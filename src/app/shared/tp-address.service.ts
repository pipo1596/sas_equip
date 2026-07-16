import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { TpAddress } from './tp-address.model';

@Injectable({ providedIn: 'root' })
export class TpAddressService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.tpAddresses}`;

  async list(tpId: number): Promise<TpAddress[]> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*LIST_ALL', tp_id: tpId }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to load addresses.');
    }
    return (data['data'] as TpAddress[]) ?? [];
  }

  async add(tpId: number, payload: Partial<TpAddress>): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*CREATE', tp_id: tpId, ...payload }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to add address.');
    }
  }

  async update(tpId: number, addrId: number, payload: Partial<TpAddress>): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*UPDATE', tp_id: tpId, addr_id: addrId, ...payload }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to update address.');
    }
  }

  async remove(tpId: number, addrId: number): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*DEL', tp_id: tpId, addr_id: addrId }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to delete address.');
    }
  }

  private async parseJson(response: Response): Promise<Record<string, unknown>> {
    try {
      const text = await response.text();
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { success: false, message: 'Invalid server response.' };
    }
  }
}
