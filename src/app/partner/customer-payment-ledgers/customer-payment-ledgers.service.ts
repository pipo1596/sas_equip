import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import { CustomerPaymentLedger, CustomerPaymentLedgerForm, CustomerPaymentLedgersPage } from './customer-payment-ledger.model';

@Injectable({ providedIn: 'root' })
export class CustomerPaymentLedgersService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerPaymentLedgers}`;

  async list(tpId: number, custId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomerPaymentLedgersPage> {
    const data = await this.post({ action: '*LIST', tpId, custId, ...params });
    return data as unknown as CustomerPaymentLedgersPage;
  }

  async listAll(tpId: number, custId: number): Promise<CustomerPaymentLedger[]> {
    const data = await this.post({ action: '*LIST_ALL', tpId, custId });
    return (data['data'] as unknown as CustomerPaymentLedger[]) ?? [];
  }

  async get(tpId: number, custId: number, ledgerId: number): Promise<CustomerPaymentLedger> {
    const data = await this.post({ action: '*GET', tpId, custId, ledgerId });
    return data as unknown as CustomerPaymentLedger;
  }

  async create(tpId: number, custId: number, form: CustomerPaymentLedgerForm): Promise<CustomerPaymentLedger> {
    const data = await this.post({ action: '*CREATE', tpId, custId, ...form });
    return data['ledger'] as unknown as CustomerPaymentLedger;
  }

  async update(tpId: number, custId: number, ledgerId: number, form: CustomerPaymentLedgerForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, custId, ledgerId, ...form });
  }

  async remove(tpId: number, custId: number, ledgerId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, custId, ledgerId });
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
