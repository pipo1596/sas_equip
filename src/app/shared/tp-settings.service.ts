import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { TpSettings } from './tp-settings.model';

@Injectable({ providedIn: 'root' })
export class TpSettingsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.tpSettings}`;

  async get(tpId: number): Promise<TpSettings> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*GET', tp_id: tpId }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to load partner settings.');
    }
    return data as unknown as TpSettings;
  }

  async getfull(tpId: number): Promise<TpSettings> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*GET_FULL', tp_id: tpId }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to load partner settings.');
    }
    return data as unknown as TpSettings;
  }

  async update(action:string,tpId: number, payload: Partial<TpSettings>): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, tp_id: tpId, ...payload }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to update settings.');
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
