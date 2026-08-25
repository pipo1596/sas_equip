import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { repairCp1252MojibakeDeep, decodeWindows1252Text } from '../../shared/cp1252-mojibake.util';
import {
  CustomerPriceList, CustomerPriceListForm, CustomerPriceListsPage,
  CustomerPriceListItem, CustomerPriceListItemForm, CustomerPriceListItemsPage,
  SkuSearchResult,
} from './customer-price-list.model';

@Injectable({ providedIn: 'root' })
export class CustomerPriceListsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerPriceLists}`;
  private readonly itemsEndpoint =
    `${environment.apiBaseUrl}${environment.endpoints.customerPriceListItems}`;

  // ── Price list headers ──────────────────────────────────────────────────

  async list(tpId: number, custId: number, params: {
    page: number; pageSize: number; search: string; status?: string;
  }): Promise<CustomerPriceListsPage> {
    const data = await this.post(this.endpoint, { action: '*LIST', tpId, custId, ...params });
    return data as unknown as CustomerPriceListsPage;
  }

  async listAll(tpId: number, custId: number): Promise<CustomerPriceList[]> {
    const data = await this.post(this.endpoint, { action: '*LIST_ALL', tpId, custId });
    return (data['data'] as unknown as CustomerPriceList[]) ?? [];
  }

  async get(tpId: number, custId: number, priceListId: number): Promise<CustomerPriceList> {
    const data = await this.post(this.endpoint, { action: '*GET', tpId, custId, priceListId });
    return data as unknown as CustomerPriceList;
  }

  async create(tpId: number, custId: number, form: CustomerPriceListForm): Promise<CustomerPriceList> {
    const data = await this.post(this.endpoint, { action: '*CREATE', tpId, custId, ...form });
    return data['priceList'] as unknown as CustomerPriceList;
  }

  async update(tpId: number, custId: number, priceListId: number, form: CustomerPriceListForm): Promise<void> {
    await this.post(this.endpoint, { action: '*UPDATE', tpId, custId, priceListId, ...form });
  }

  async remove(tpId: number, custId: number, priceListId: number): Promise<void> {
    await this.post(this.endpoint, { action: '*DELETE', tpId, custId, priceListId });
  }

  // ── Item-level (SKU) pricing ─────────────────────────────────────────────

  async listItems(tpId: number, custId: number, priceListId: number, params: { page: number; pageSize: number; search: string }): Promise<CustomerPriceListItemsPage> {
    const data = await this.post(this.itemsEndpoint, { action: '*LIST', tpId, custId, priceListId, ...params });
    return data as unknown as CustomerPriceListItemsPage;
  }

  async createItem(tpId: number, custId: number, priceListId: number, form: CustomerPriceListItemForm): Promise<CustomerPriceListItem> {
    const data = await this.post(this.itemsEndpoint, { action: '*CREATE', tpId, custId, priceListId, ...form });
    return data['item'] as unknown as CustomerPriceListItem;
  }

  // Bulk-adds multiple SKUs to a price list in one call, each with its own
  // price/compareAtPrc/status — used by the multi-select "Add Items" picker.
  async createItems(tpId: number, custId: number, priceListId: number, items: Array<{ skuId: number; price: number; compareAtPrc: number | null; status: 'ACTIVE' | 'INACTIVE' }>): Promise<void> {
    await this.post(this.itemsEndpoint, { action: '*ITEM_BULK', tpId, custId, priceListId, items });
  }

  async updateItem(tpId: number, custId: number, priceListId: number, itemId: number, form: CustomerPriceListItemForm): Promise<void> {
    await this.post(this.itemsEndpoint, { action: '*UPDATE', tpId, custId, priceListId, itemId, ...form });
  }

  async removeItem(tpId: number, custId: number, priceListId: number, itemId: number): Promise<void> {
    await this.post(this.itemsEndpoint, { action: '*DELETE', tpId, custId, priceListId, itemId });
  }

  // Cross-product SKU lookup for the "add item" picker — searches by SKU
  // code / product title across the whole catalog (not scoped to one
  // product, unlike ProductSkusService.list). Kept on the price-list-header
  // endpoint since it queries the product catalog, not TP_CUST_PRICE_LIST_ITEMS.
  async searchSkus(tpId: number, search: string): Promise<SkuSearchResult[]> {
    const data = await this.post(this.endpoint, { action: '*SKU_SRCH', tpId, search });
    return (data['data'] as unknown as SkuSearchResult[]) ?? [];
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
