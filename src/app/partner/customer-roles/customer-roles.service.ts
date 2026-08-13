import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import { CustomerRole, CustomerRoleForm, CustomerRolesPage } from './customer-role.model';

@Injectable({ providedIn: 'root' })
export class CustomerRolesService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerRoles}`;

  async list(tpId: number, custId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomerRolesPage> {
    const data = await this.post({ action: '*LIST', tpId, custId, ...params });
    return data as unknown as CustomerRolesPage;
  }

  async get(tpId: number, custId: number, roleId: number): Promise<CustomerRole> {
    const data = await this.post({ action: '*GET', tpId, custId, roleId });
    return data as unknown as CustomerRole;
  }

  async create(tpId: number, custId: number, form: CustomerRoleForm): Promise<CustomerRole> {
    const data = await this.post({ action: '*CREATE', tpId, custId, ...form });
    return data['role'] as unknown as CustomerRole;
  }

  async update(tpId: number, custId: number, roleId: number, form: CustomerRoleForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, custId, roleId, ...form });
  }

  async remove(tpId: number, custId: number, roleId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, custId, roleId });
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
