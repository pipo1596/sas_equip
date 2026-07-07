import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  ProductSku, ProductSkuForm,
  ProductOption, ProductImage, ProductAttribute,
  ProductInventory, ProductPricing,
} from './product.model';

@Injectable({ providedIn: 'root' })
export class ProductSkusService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.productSkus}`;

  // ── SKU CRUD ──────────────────────────────────────────────────────────────

  async list(tpId: number, productId: number): Promise<ProductSku[]> {
    const data = await this.post({ action: '*LIST_ALL', tpId, productId });
    return (data['data'] as unknown as ProductSku[]) ?? [];
  }

  async get(tpId: number, skuId: number): Promise<ProductSku> {
    const data = await this.post({ action: '*GET', tpId, skuId });
    return data as unknown as ProductSku;
  }

  async create(tpId: number, productId: number, form: ProductSkuForm): Promise<ProductSku> {
    const data = await this.post({ action: '*CREATE', tpId, productId, ...form });
    return data as unknown as ProductSku;
  }

  async update(tpId: number, skuId: number, form: ProductSkuForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, skuId, ...form });
  }

  async remove(tpId: number, skuId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, skuId });
  }

  // ── Options ───────────────────────────────────────────────────────────────

  async listOptions(tpId: number, skuId: number): Promise<ProductOption[]> {
    const data = await this.post({ action: '*LIST_OPTS', tpId, skuId });
    return data['data'] as unknown as ProductOption[];
  }

  async saveOptions(tpId: number, skuId: number, options: Array<{ optName: string; optValue: string; sortOrder: number }>): Promise<void> {
    await this.post({ action: '*SAVE_OPTS', tpId, skuId, options });
  }

  // ── Images ────────────────────────────────────────────────────────────────

  async listImages(tpId: number, skuId: number): Promise<ProductImage[]> {
    const data = await this.post({ action: '*LIST_IMAGES', tpId, skuId });
    return data['data'] as unknown as ProductImage[];
  }

  async addImage(tpId: number, skuId: number, imgUrl: string, imgAlt: string): Promise<ProductImage> {
    const data = await this.post({ action: '*ADD_IMAGE', tpId, skuId, imgUrl, imgAlt });
    return data['image'] as unknown as ProductImage;
  }

  async deleteImage(tpId: number, imgId: number): Promise<void> {
    await this.post({ action: '*DELETE_IMAGE', tpId, imgId });
  }

  // ── Attributes ────────────────────────────────────────────────────────────

  async listAttributes(tpId: number, skuId: number): Promise<ProductAttribute[]> {
    const data = await this.post({ action: '*LIST_ATTRS', tpId, skuId });
    return data['data'] as unknown as ProductAttribute[];
  }

  async addAttribute(tpId: number, attr: Omit<ProductAttribute, 'attrId' | 'tpId' | 'createdTs'>): Promise<ProductAttribute> {
    const data = await this.post({ action: '*ADD_ATTR', tpId, ...attr });
    return data['attribute'] as unknown as ProductAttribute;
  }

  async updateAttribute(tpId: number, attrId: number, attr: Partial<ProductAttribute>): Promise<void> {
    await this.post({ action: '*UPDATE_ATTR', tpId, attrId, ...attr });
  }

  async deleteAttribute(tpId: number, attrId: number): Promise<void> {
    await this.post({ action: '*DELETE_ATTR', tpId, attrId });
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  async listInventory(tpId: number, skuId: number): Promise<ProductInventory[]> {
    const data = await this.post({ action: '*LIST_INV', tpId, skuId });
    return data['data'] as unknown as ProductInventory[];
  }

  async updateInventory(tpId: number, invId: number, fields: Partial<ProductInventory>): Promise<void> {
    await this.post({ action: '*UPDATE_INV', tpId, invId, ...fields });
  }

  // ── Pricing ───────────────────────────────────────────────────────────────

  async listPricing(tpId: number, skuId: number): Promise<ProductPricing[]> {
    const data = await this.post({ action: '*LIST_PRICING', tpId, skuId });
    return data['data'] as unknown as ProductPricing[];
  }

  async addPricing(tpId: number, pricing: Omit<ProductPricing, 'priceId' | 'tpId' | 'createdTs' | 'updatedTs'>): Promise<ProductPricing> {
    const data = await this.post({ action: '*ADD_PRICING', tpId, ...pricing });
    return data['pricing'] as unknown as ProductPricing;
  }

  async updatePricing(tpId: number, priceId: number, pricing: Partial<ProductPricing>): Promise<void> {
    await this.post({ action: '*UPDATE_PRICING', tpId, priceId, ...pricing });
  }

  async deletePricing(tpId: number, priceId: number): Promise<void> {
    await this.post({ action: '*DELETE_PRICING', tpId, priceId });
  }

  // ── HTTP helper ───────────────────────────────────────────────────────────

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
      return JSON.parse(await response.text()) as Record<string, unknown>;
    } catch {
      return { success: false, message: 'Invalid server response.' };
    }
  }
}
