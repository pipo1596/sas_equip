import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import {
  CustomerProgramView, CustomerProgramViewForm, CustomerProgramViewsPage, CustomerProgramViewLocation, ViewSelections,
} from './customer-program-view.model';

// The *LIST action returns the assigned-locations array under the raw key
// "locations" (null when a view has none) — CustomerProgramView normalizes
// this to a never-null "assignedLocations" for the rest of the app.
type CustomerProgramViewRow = Omit<CustomerProgramView, 'assignedLocations'> & {
  locations: CustomerProgramViewLocation[] | null;
};

@Injectable({ providedIn: 'root' })
export class CustomerProgramViewsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerProgramViews}`;

  async list(tpId: number, custId: number, programId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomerProgramViewsPage> {
    const data = await this.post({ action: '*LIST', tpId, custId, programId, ...params });
    const rows = (data['data'] as unknown as CustomerProgramViewRow[]) ?? [];
    return {
      data: rows.map(({ locations, ...row }) => ({
        ...row,
        assignedLocations: locations ?? [],
        categoryTotalCount: row.categoryTotalCount ?? 0,
        categorySelectedCount: row.categorySelectedCount ?? 0,
        skuTotalCount: row.skuTotalCount ?? 0,
        skuSelectedCount: row.skuSelectedCount ?? 0,
      })),
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

  // Duplicates an existing view's category/SKU selections into a new view —
  // form carries the (possibly edited) header fields for the new copy, while
  // viewId tells the backend which view's selections to clone.
  async copyView(tpId: number, custId: number, programId: number, viewId: number, form: CustomerProgramViewForm): Promise<void> {
    await this.post({ action: '*COPY', tpId, custId, programId, viewId, ...form });
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

  // progCatIds/progProdIds below add or remove every id in one call rather
  // than one row at a time — each id is wrapped as its own object (e.g.
  // [{progCatId: 1}, {progCatId: 2}]), matching *SKU_BULK's shape elsewhere.
  async addCategory(tpId: number, custId: number, programId: number, viewId: number, progCatIds: number[]): Promise<void> {
    const ids = progCatIds.map(id => ({ progCatId: id }));
    await this.post({ action: '*CAT_ADD', tpId, custId, programId, viewId, progCatIds: ids });
  }

  async removeCategory(tpId: number, custId: number, programId: number, viewId: number, progCatIds: number[]): Promise<void> {
    const ids = progCatIds.map(id => ({ progCatId: id }));
    await this.post({ action: '*CAT_DEL', tpId, custId, programId, viewId, progCatIds: ids });
  }

  async addSku(tpId: number, custId: number, programId: number, viewId: number, progProdIds: number[]): Promise<void> {
    const ids = progProdIds.map(id => ({ progProdId: id }));
    await this.post({ action: '*SKU_ADD', tpId, custId, programId, viewId, progProdIds: ids });
  }

  async removeSku(tpId: number, custId: number, programId: number, viewId: number, progProdIds: number[]): Promise<void> {
    const ids = progProdIds.map(id => ({ progProdId: id }));
    await this.post({ action: '*SKU_DEL', tpId, custId, programId, viewId, progProdIds: ids });
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
