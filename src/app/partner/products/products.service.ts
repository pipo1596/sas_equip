import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  Product, ProductForm, ProductsPage,
  ProductImage, ProductAttribute, ProductCategoryAssignment, ProductXref,
} from './product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.products}`;

  // ── Product CRUD ──────────────────────────────────────────────────────────

  async list(tpId: number, params: {
    page: number;
    pageSize: number;
    search: string;
    status?: string;
    brandId?: number | null;
    catId?: number | null;
    platformCd?: string;
  }): Promise<ProductsPage> {
    const body: Record<string, unknown> = { action: '*LIST', tpId, ...params };
    if (!params.status)     delete body['status'];
    if (!params.brandId)    delete body['brandId'];
    if (!params.catId)      delete body['catId'];
    if (!params.platformCd) delete body['platformCd'];
    const data = await this.post(body);
    return data as unknown as ProductsPage;
  }

  async listPlatforms(tpId: number): Promise<string[]> {
    const data = await this.post({ action: '*LIST_PLATFORMS', tpId });
    return (data['data'] ?? []) as unknown as string[];
  }

  async get(tpId: number, productId: number): Promise<Product> {
    const data = await this.post({ action: '*GET', tpId, productId });
    return data['product'] as unknown as Product;
  }

  async create(tpId: number, form: ProductForm): Promise<Product> {
    const data = await this.post({ action: '*CREATE', tpId, ...form });
    return data['product'] as unknown as Product;
  }

  async update(tpId: number, productId: number, form: ProductForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, productId, ...form });
  }

  async remove(tpId: number, productId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, productId });
  }

  // ── Images ────────────────────────────────────────────────────────────────

  async listImages(tpId: number, productId: number): Promise<ProductImage[]> {
    const data = await this.post({ action: '*LIST_IMAGES', tpId, productId });
    return data['data'] as unknown as ProductImage[];
  }

  async addImage(tpId: number, productId: number, imgUrl: string, imgAlt: string, isThumbnail: 'Y' | 'N'): Promise<ProductImage> {
    const data = await this.post({ action: '*ADD_IMAGE', tpId, productId, imgUrl, imgAlt, isThumbnail });
    return data['image'] as unknown as ProductImage;
  }

  async deleteImage(tpId: number, imgId: number): Promise<void> {
    await this.post({ action: '*DELETE_IMAGE', tpId, imgId });
  }

  async setThumbnail(tpId: number, imgId: number): Promise<void> {
    await this.post({ action: '*SET_THUMBNAIL', tpId, imgId });
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async listProductCategories(tpId: number, productId: number): Promise<ProductCategoryAssignment[]> {
    const data = await this.post({ action: '*LIST_CATS', tpId, productId });
    return data['data'] as unknown as ProductCategoryAssignment[];
  }

  async setProductCategories(tpId: number, productId: number, assignments: Array<{ catId: number; isPrimary: 'Y' | 'N' }>): Promise<void> {
    await this.post({ action: '*SET_CATS', tpId, productId, assignments });
  }

  // ── Attributes ────────────────────────────────────────────────────────────

  async listAttributes(tpId: number, productId: number): Promise<ProductAttribute[]> {
    const data = await this.post({ action: '*LIST_ATTRS', tpId, productId });
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

  // ── Cross-refs ────────────────────────────────────────────────────────────

  async listXrefs(tpId: number, productId: number): Promise<ProductXref[]> {
    const data = await this.post({ action: '*LIST_XREFS', tpId, productId });
    return data['data'] as unknown as ProductXref[];
  }

  async addXref(tpId: number, productId: number, xref: Partial<ProductXref>): Promise<ProductXref> {
    const data = await this.post({ action: '*ADD_XREF', tpId, productId, ...xref });
    return data['xref'] as unknown as ProductXref;
  }

  async deleteXref(tpId: number, xrefId: number): Promise<void> {
    await this.post({ action: '*DELETE_XREF', tpId, xrefId });
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
