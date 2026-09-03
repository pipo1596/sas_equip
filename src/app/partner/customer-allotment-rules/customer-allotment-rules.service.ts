import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import { parseArrayResponse } from '../../shared/parse-array-response.util';
import {
  CustomerAllotmentRule, CustomerAllotmentRuleForm, CustomerAllotmentRulesPage,
  RuleAssortmentScope, RuleQuotaLimit, RuleQuotaLimitForm, RuleLedgerSlot,
} from './customer-allotment-rule.model';

@Injectable({ providedIn: 'root' })
export class CustomerAllotmentRulesService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerAllotmentRules}`;

  async list(tpId: number, custId: number, roleId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomerAllotmentRulesPage> {
    const data = await this.post({ action: '*LIST', tpId, custId, roleId, ...params });
    return data as unknown as CustomerAllotmentRulesPage;
  }

  async listAll(tpId: number, custId: number, roleId: number): Promise<CustomerAllotmentRule[]> {
    const data = await this.post({ action: '*LIST_ALL', tpId, custId, roleId });
    return parseArrayResponse<CustomerAllotmentRule>(data, 'CustomerAllotmentRulesService *LIST_ALL');
  }

  async get(tpId: number, custId: number, roleId: number, ruleId: number): Promise<CustomerAllotmentRule> {
    const data = await this.post({ action: '*GET', tpId, custId, roleId, ruleId });
    return data as unknown as CustomerAllotmentRule;
  }

  async create(tpId: number, custId: number, roleId: number, form: CustomerAllotmentRuleForm): Promise<CustomerAllotmentRule> {
    const data = await this.post({ action: '*CREATE', tpId, custId, roleId, ...form });
    // Tolerate either { rule: {...} } or the created row returned flat at
    // the top level — the real backend's exact shape wasn't confirmed yet.
    return (data['rule'] ?? data) as unknown as CustomerAllotmentRule;
  }

  async update(tpId: number, custId: number, roleId: number, ruleId: number, form: CustomerAllotmentRuleForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, custId, roleId, ruleId, ...form });
  }

  async remove(tpId: number, custId: number, roleId: number, ruleId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, custId, roleId, ruleId });
  }

  async getScope(tpId: number, custId: number, roleId: number, ruleId: number): Promise<RuleAssortmentScope[]> {
    const data = await this.post({ action: '*SCOPE_GET', tpId, custId, roleId, ruleId });
    return parseArrayResponse<RuleAssortmentScope>(data, 'CustomerAllotmentRulesService *SCOPE_GET');
  }

  // Bulk-replaces the rule's category scope in one call.
  async setScope(tpId: number, custId: number, roleId: number, ruleId: number, items: { progCatId: number; unitQty: number | null }[]): Promise<void> {
    await this.post({ action: '*SCOPE_SET', tpId, custId, roleId, ruleId, items });
  }

  async listQuotas(tpId: number, custId: number, roleId: number, ruleId: number): Promise<RuleQuotaLimit[]> {
    const data = await this.post({ action: '*QUOTA_LIST', tpId, custId, roleId, ruleId });
    return parseArrayResponse<RuleQuotaLimit>(data, 'CustomerAllotmentRulesService *QUOTA_LIST');
  }

  async createQuota(tpId: number, custId: number, roleId: number, ruleId: number, form: RuleQuotaLimitForm): Promise<RuleQuotaLimit> {
    const data = await this.post({ action: '*QUOTA_CREATE', tpId, custId, roleId, ruleId, ...form });
    return (data['quota'] ?? data) as unknown as RuleQuotaLimit;
  }

  async updateQuota(tpId: number, custId: number, roleId: number, ruleId: number, quotaId: number, form: RuleQuotaLimitForm): Promise<void> {
    await this.post({ action: '*QUOTA_UPDATE', tpId, custId, roleId, ruleId, quotaId, ...form });
  }

  async removeQuota(tpId: number, custId: number, roleId: number, ruleId: number, quotaId: number): Promise<void> {
    await this.post({ action: '*QUOTA_DELETE', tpId, custId, roleId, ruleId, quotaId });
  }

  async getLedgerChain(tpId: number, custId: number, roleId: number, ruleId: number): Promise<RuleLedgerSlot[]> {
    const data = await this.post({ action: '*LEDGER_GET', tpId, custId, roleId, ruleId });
    return parseArrayResponse<RuleLedgerSlot>(data, 'CustomerAllotmentRulesService *LEDGER_GET');
  }

  // Bulk-replaces the rule's ledger precedence chain — an omitted
  // precedence means that slot is empty, never a null ledgerId.
  async setLedgerChain(tpId: number, custId: number, roleId: number, ruleId: number, slots: { precedence: 1 | 2 | 3; ledgerId: number }[]): Promise<void> {
    await this.post({ action: '*LEDGER_SET', tpId, custId, roleId, ruleId, slots });
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
