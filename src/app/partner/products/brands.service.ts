import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Brand, BrandForm, BrandsPage } from './brand.model';

@Injectable({ providedIn: 'root' })
export class BrandsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.brands}`;

  async list(tpId: number, params: { page: number; pageSize: number; search: string }): Promise<BrandsPage> {
    const data = await this.post({ action: '*LIST', tpId, ...params });
    return data as unknown as BrandsPage;
  }

  async get(tpId: number, brandId: number): Promise<Brand> {
    const data = await this.post({ action: '*GET', tpId, brandId });
    return data['brand'] as unknown as Brand;
  }

  async listAll(tpId: number): Promise<Brand[]> {
    const data = await this.post({ action: '*LIST_ALL', tpId });
    return data['data'] as unknown as Brand[];
  }

  async create(tpId: number, form: BrandForm): Promise<Brand> {
    const data = await this.post({ action: '*CREATE', tpId, ...form });
    return data['brand'] as unknown as Brand;
  }

  async update(tpId: number, brandId: number, form: BrandForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, brandId, ...form });
  }

  async remove(tpId: number, brandId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, brandId });
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
