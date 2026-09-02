import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import {
  CustomerProgram, CustomerProgramForm, CustomerProgramsPage, CustomerProgramTree,
  CustomerProgramSkuCandidate,
} from './customer-program.model';

@Injectable({ providedIn: 'root' })
export class CustomerProgramsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerPrograms}`;

  async list(tpId: number, custId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomerProgramsPage> {
    const data = await this.post({ action: '*LIST', tpId, custId, ...params });
    return data as unknown as CustomerProgramsPage;
  }

  // Full, unpaginated list — used to populate assortment/scope pickers
  // (Allotment Rules) rather than as a page-rendering source.
  async listAll(tpId: number, custId: number): Promise<CustomerProgram[]> {
    const data = await this.post({ action: '*LIST_ALL', tpId, custId });
    return (data['data'] as unknown as CustomerProgram[]) ?? [];
  }

  async get(tpId: number, custId: number, programId: number): Promise<CustomerProgram> {
    const data = await this.post({ action: '*GET', tpId, custId, programId });
    return data as unknown as CustomerProgram;
  }

  async create(tpId: number, custId: number, form: CustomerProgramForm): Promise<CustomerProgram> {
    const data = await this.post({ action: '*CREATE', tpId, custId, ...form });
    return data['program'] as unknown as CustomerProgram;
  }

  async update(tpId: number, custId: number, programId: number, form: CustomerProgramForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, custId, programId, ...form });
  }

  async remove(tpId: number, custId: number, programId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, custId, programId });
  }

  // Read-only category/product tree for a program, pre-resolved server-side:
  // customerPrice already reflects PROGRAM.PRICE_LIST_ID's overrides,
  // falling back to PRODUCT_SKU.PRICE where no TP_CUST_PRICE_LIST_ITEMS
  // row exists — same resolution SELMTPCPRI already implements.
  async getTree(tpId: number, custId: number, programId: number): Promise<CustomerProgramTree> {
    const data = await this.post({ action: '*TREE', tpId, custId, programId });
    return data as unknown as CustomerProgramTree;
  }

  // Re-reads CATEGORY/PRODUCT and refreshes the denormalized name
  // snapshots + LAST_SYNCED_TS on the program's tree.
  async regenerate(tpId: number, custId: number, programId: number): Promise<void> {
    await this.post({ action: '*REGENRT', tpId, custId, programId });
  }

  // Assigns a real catalog CATEGORY into this program's tree, optionally
  // under an existing program category node (top-level when parentProgCatId
  // is null). Takes categoryName (not categoryId) since the tree node stores
  // its own denormalized name snapshot rather than a live FK lookup.
  async addCategory(tpId: number, custId: number, programId: number, params: { categoryName: string; parentProgCatId: number | null }): Promise<void> {
    await this.post({ action: '*CAT_ADD', tpId, custId, programId, ...params });
  }

  // Renames a category node's denormalized name snapshot — does not touch
  // the underlying catalog CATEGORY row it was created from (if any).
  async updateCategory(tpId: number, custId: number, programId: number, progCatId: number, categoryName: string): Promise<void> {
    await this.post({ action: '*CAT_UPD', tpId, custId, programId, progCatId, categoryName });
  }

  // Removes a category node (and, per TPCPCAT_PARENT_FK's ON DELETE CASCADE,
  // its child nodes and their SKU placements) from a program's tree.
  async removeCategory(tpId: number, custId: number, programId: number, progCatId: number): Promise<void> {
    await this.post({ action: '*CAT_DEL', tpId, custId, programId, progCatId });
  }

  // Re-parents a category node under a different parent (or to top level
  // when newParentProgCatId is null) — moves the node and, via
  // TPCPCAT_PARENT_FK, its whole subtree along with it.
  async moveCategory(tpId: number, custId: number, programId: number, progCatId: number, newParentProgCatId: number | null): Promise<void> {
    await this.post({ action: '*CAT_MOVE', tpId, custId, programId, progCatId, newParentProgCatId });
  }

  // Moves every SKU placement of one product from one leaf category node to
  // another — used when a product's items need to move under a different
  // leaf (e.g. before deleting the source, or consolidating two assortments).
  async reassignSkus(tpId: number, custId: number, programId: number, fromProgCatId: number, toProgCatId: number, productPk: number): Promise<void> {
    await this.post({ action: '*SKU_MOVE', tpId, custId, programId, fromProgCatId, toProgCatId, productPk });
  }

  // Candidate SKUs for the "Add SKUs" picker, scoped to this program (so
  // basePrice/customerPrice resolve against PROGRAM.PRICE_LIST_ID the same
  // way *TREE's rows do) and this category node (so SKUs already placed
  // there are excluded server-side).
  async searchSkus(tpId: number, custId: number, programId: number, progCatId: number, search: string): Promise<CustomerProgramSkuCandidate[]> {
    const data = await this.post({ action: '*SKU_SRCH', tpId, custId, programId, progCatId, search });
    return (data['data'] as unknown as CustomerProgramSkuCandidate[]) ?? [];
  }

  // Bulk-assigns catalog SKUs into a program category node in one call — a
  // SKU can be cross-listed under more than one category node in the same
  // program (TPCPSKU_PROD_UQ is scoped to PROG_CAT_ID + SKU_ID, not
  // PROGRAM_ID + SKU_ID), so the same skuId can be added again under a
  // different progCatId.
  async addSkus(tpId: number, custId: number, programId: number, progCatId: number, skuIds: number[]): Promise<void> {
    const skus = skuIds.map(skuId => ({ skuId }));
    await this.post({ action: '*SKU_BULK', tpId, custId, programId, progCatId, skuIds: skus });
  }

  // Removes one SKU placement (progProdId) from its category node — does
  // not touch the underlying catalog PRODUCT_SKU row.
  async removeSku(tpId: number, custId: number, programId: number, progProdId: number): Promise<void> {
    await this.post({ action: '*SKU_DEL', tpId, custId, programId, progProdId });
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
