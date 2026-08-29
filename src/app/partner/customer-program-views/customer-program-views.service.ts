import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import {
  CustomerProgramView, CustomerProgramViewForm, CustomerProgramViewsPage, ViewSelections,
} from './customer-program-view.model';

@Injectable({ providedIn: 'root' })
export class CustomerProgramViewsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerProgramViews}`;

  async list(tpId: number, custId: number, programId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomerProgramViewsPage> {
    const data = await this.post({ action: '*LIST', tpId, custId, programId, ...params });
    return {
      data: (data['data'] as unknown as CustomerProgramView[]) ?? [],
      pagination: (data['pagination'] as unknown as CustomerProgramViewsPage['pagination']) ?? { totalRows: 0, page: params.page, pageSize: params.pageSize },
    };
  }

  async get(tpId: number, custId: number, programId: number, viewId: number): Promise<CustomerProgramView> {
    const data = await this.post({ action: '*GET', tpId, custId, programId, viewId });
    return data as unknown as CustomerProgramView;
  }

  async create(tpId: number, custId: number, programId: number, form: CustomerProgramViewForm): Promise<CustomerProgramView> {
    const data = await this.post({ action: '*CREATE', tpId, custId, programId, ...form });
    return data['view'] as unknown as CustomerProgramView;
  }

  async update(tpId: number, custId: number, programId: number, viewId: number, form: CustomerProgramViewForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, custId, programId, viewId, ...form });
  }

  async remove(tpId: number, custId: number, programId: number, viewId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, custId, programId, viewId });
  }

  // Which progCatIds/progProdIds are directly included in this View — the
  // editor combines this with CustomerProgramsService.getTree()'s full tree
  // to compute rolled-up ("included via an ancestor category") state, rather
  // than this action returning a second copy of the tree shape.
  async getSelections(tpId: number, custId: number, programId: number, viewId: number): Promise<ViewSelections> {
    const data = await this.post({ action: '*SEL_GET', tpId, custId, programId, viewId });
    return {
      categoryIds: (data['categoryIds'] as unknown as number[]) ?? [],
      progProdIds: (data['progProdIds'] as unknown as number[]) ?? [],
    };
  }

  async addCategory(tpId: number, custId: number, programId: number, viewId: number, progCatId: number): Promise<void> {
    await this.post({ action: '*CAT_ADD', tpId, custId, programId, viewId, progCatId });
  }

  async removeCategory(tpId: number, custId: number, programId: number, viewId: number, progCatId: number): Promise<void> {
    await this.post({ action: '*CAT_DEL', tpId, custId, programId, viewId, progCatId });
  }

  async addSku(tpId: number, custId: number, programId: number, viewId: number, progProdId: number): Promise<void> {
    await this.post({ action: '*SKU_ADD', tpId, custId, programId, viewId, progProdId });
  }

  async removeSku(tpId: number, custId: number, programId: number, viewId: number, progProdId: number): Promise<void> {
    await this.post({ action: '*SKU_DEL', tpId, custId, programId, viewId, progProdId });
  }

  // Mass-selects every category and SKU placement in the program into this
  // view in one call — not a client-side loop of *CAT_ADD/*SKU_ADD.
  async selectAll(tpId: number, custId: number, programId: number, viewId: number): Promise<void> {
    await this.post({ action: '*SEL_ALL', tpId, custId, programId, viewId });
  }

  // Mass-clears every category and SKU placement from this view in one call
  // — not a client-side loop of *CAT_DEL/*SKU_DEL.
  async clearAll(tpId: number, custId: number, programId: number, viewId: number): Promise<void> {
    await this.post({ action: '*SEL_CLR', tpId, custId, programId, viewId });
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
