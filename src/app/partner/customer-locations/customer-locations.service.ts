import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import { CustomerLocation, CustomerLocationForm, CustomerLocationsPage } from './customer-location.model';

@Injectable({ providedIn: 'root' })
export class CustomerLocationsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerLocations}`;

  private readonly assignEmployeesEndpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerLocationEmployees}`;

  async list(tpId: number, custId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomerLocationsPage> {
    const data = await this.post(this.endpoint, { action: '*LIST', tpId, custId, ...params });
    return data as unknown as CustomerLocationsPage;
  }

  async listAll(tpId: number, custId: number): Promise<CustomerLocation[]> {
    const data = await this.post(this.endpoint, { action: '*LIST_ALL', tpId, custId });
    return (data['data'] as unknown as CustomerLocation[]) ?? [];
  }

  async get(tpId: number, custId: number, locId: number): Promise<CustomerLocation> {
    const data = await this.post(this.endpoint, { action: '*GET', tpId, custId, locId });
    return data as unknown as CustomerLocation;
  }

  async create(tpId: number, custId: number, form: CustomerLocationForm): Promise<CustomerLocation> {
    const data = await this.post(this.endpoint, { action: '*CREATE', tpId, custId, ...form });
    return data['location'] as unknown as CustomerLocation;
  }

  async update(tpId: number, custId: number, locId: number, form: CustomerLocationForm): Promise<void> {
    await this.post(this.endpoint, { action: '*UPDATE', tpId, custId, locId, ...form });
  }

  async remove(tpId: number, custId: number, locId: number): Promise<void> {
    await this.post(this.endpoint, { action: '*DELETE', tpId, custId, locId });
  }

  // Bulk-replaces the full set of employees assigned to a location in one call —
  // empIds is the complete resulting roster, not a diff of what changed.
  async assignEmployees(tpId: number, custId: number, locId: number, empIds: number[]): Promise<void> {
    const users = empIds.map(id => ({ empId: id }));
    await this.post(this.assignEmployeesEndpoint, { action: '*ASSIGN', tpId, custId, locId, empIds: users });
  }

  async getAssignedEmployeeIds(tpId: number, custId: number, locId: number): Promise<number[]> {
    const data = await this.post(this.assignEmployeesEndpoint, { action: '*GET', tpId, custId, locId });
    // 'data' is a JSON-encoded string (e.g. '[{"empId":4},{"empId":2}]'), not a parsed array.
    const raw = data['data'];
    if (typeof raw !== 'string') return [];
    const empIds = JSON.parse(raw) as Array<{ empId: number }>;
    return empIds.map(item => item.empId);
  }

  private async post(endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch(endpoint, {
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
