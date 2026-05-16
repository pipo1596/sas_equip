import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PlatformAdmin, PlatformAdminForm, PlatformAdminsPage } from './platform-admin.model';

@Injectable({ providedIn: 'root' })
export class PlatformAdminsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.platformAdmins}`;

  async list(params: { page: number; pageSize: number; search: string }): Promise<PlatformAdminsPage> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'LIST', ...params }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to load platform admins.');
    }
    return data as unknown as PlatformAdminsPage;
  }

  async create(form: PlatformAdminForm): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'CREATE', ...form }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to create platform admin.');
    }
  }

  async update(padminId: number, form: PlatformAdminForm): Promise<void> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'UPDATE', padminId, ...form }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to update platform admin.');
    }
  }

  async remove(padminId: number): Promise<PlatformAdmin> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'DELETE', padminId }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to delete platform admin.');
    }
    return data as unknown as PlatformAdmin;
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
