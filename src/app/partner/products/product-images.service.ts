import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProductImage } from './product.model';

@Injectable({ providedIn: 'root' })
export class ProductImagesService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.productImages}`;

  async get(tpId: number, productPk: number, skuId?: number): Promise<ProductImage[]> {
    const body: Record<string, unknown> = { action: '*LIST', tpId, productPk };
    if (skuId != null) body['skuId'] = skuId;
    const data = await this.post(body);
    return (data['data'] as unknown as ProductImage[]) ?? [];
  }

  async add(tpId: number, productPk: number, imgUrl: string, imgType: string, imgDesc: string, sortOrder: number, skuId?: number): Promise<ProductImage> {
    const body: Record<string, unknown> = { action: '*CREATE', tpId, productPk, imgUrl, imgType, imgDesc, sortOrder };
    if (skuId != null) body['skuId'] = skuId;
    const data = await this.post(body);
    return data['image'] as unknown as ProductImage;
  }

  async updateSortOrder(tpId: number, productPk: number, imageId: number, sortOrder: number): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, productPk, imageId, sortOrder });
  }

  async remove(tpId: number, productPk: number, imageId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, productPk, imageId });
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
      return JSON.parse(await response.text()) as Record<string, unknown>;
    } catch {
      return { success: false, message: 'Invalid server response.' };
    }
  }
}
