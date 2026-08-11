import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import { CustomerEmployee, CustomerEmployeeForm, CustomerEmployeesPage } from './customer-employee.model';

@Injectable({ providedIn: 'root' })
export class CustomerEmployeesService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerEmployees}`;

  async list(tpId: number, custId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomerEmployeesPage> {
    const data = await this.post({ action: '*LIST', tpId, custId, ...params });
    return data as unknown as CustomerEmployeesPage;
  }

  async get(tpId: number, custId: number, empId: number): Promise<CustomerEmployee> {
    const data = await this.post({ action: '*GET', tpId, custId, empId });
    return data as unknown as CustomerEmployee;
  }

  async create(tpId: number, custId: number, form: CustomerEmployeeForm): Promise<CustomerEmployee> {
    const data = await this.post({ action: '*CREATE', tpId, custId, ...form });
    return data['employee'] as unknown as CustomerEmployee;
  }

  async update(tpId: number, custId: number, empId: number, form: CustomerEmployeeForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, custId, empId, ...form });
  }

  async remove(tpId: number, custId: number, empId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, custId, empId });
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
