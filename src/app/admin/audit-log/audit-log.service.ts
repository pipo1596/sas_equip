import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuditLogEntry, AuditLogPage } from './audit-log.model';

export interface AuditLogListParams {
  entityType: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.auditLog}`;

  async list(params: AuditLogListParams): Promise<AuditLogPage> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*LIST', ...params }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to load audit log.');
    }
    return data as unknown as AuditLogPage;
  }

  async getEntry(audId: number): Promise<AuditLogEntry> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: '*GET', audId }),
      credentials: 'include',
    });
    const data = await this.parseJson(response);
    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message']) ?? 'Failed to load audit entry.');
    }
    return data as unknown as AuditLogEntry;
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
