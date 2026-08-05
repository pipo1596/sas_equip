import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import { PartnerUser, PartnerUserForm, PartnerUsersPage } from './partner-user.model';

@Injectable({ providedIn: 'root' })
export class PartnerUsersService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.tpUsers}`;

  async list(tpId: number, params: { page: number; pageSize: number; search: string }): Promise<PartnerUsersPage> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*LIST', tpId, ...params }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to load users.');
    }
    return data as unknown as PartnerUsersPage;
  }

  async create(tpId: number, form: PartnerUserForm): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*CREATE', tpId, ...form }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to create user.');
    }
  }

  async update(tpId: number, userId: number, form: PartnerUserForm): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*UPDATE', tpId, userId, ...form }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to update user.');
    }
  }

  async remove(tpId: number, userId: number): Promise<PartnerUser> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*DELETE', tpId, userId }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to delete user.');
    }
    return data as unknown as PartnerUser;
  }

  private async parseJson(response: Response): Promise<Record<string, unknown>> {
    try {
      const text = await decodeWindows1252Text(response);
      return repairCp1252MojibakeDeep(JSON.parse(text) as Record<string, unknown>);
    } catch {
      return { success: false, message: 'Invalid server response.' };
    }
  }
}
