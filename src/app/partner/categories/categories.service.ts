import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Category, CategoryForm, CategoriesPage } from './category.model';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.categories}`;

  async list(tpId: number, params: { page: number; pageSize: number; search: string }): Promise<CategoriesPage> {
    const data = await this.post({ action: '*LIST', tpId, ...params });
    return data as unknown as CategoriesPage;
  }

  async listAll(tpId: number): Promise<Category[]> {
    const data = await this.post({ action: '*LIST', tpId, page: 1, pageSize: 500, search: '' });
    return (data['data'] as unknown as Category[]) ?? [];
  }

  async get(tpId: number, catId: number): Promise<Category> {
    const data = await this.post({ action: '*GET', tpId, catId });
    return data as unknown as Category;
  }

  async create(tpId: number, form: CategoryForm): Promise<Category> {
    const data = await this.post({ action: '*CREATE', tpId, ...form });
    return data['category'] as unknown as Category;
  }

  async update(tpId: number, catId: number, form: CategoryForm): Promise<void> {
    await this.post({ action: '*UPDATE', tpId, catId, ...form });
  }

  async remove(tpId: number, catId: number): Promise<void> {
    await this.post({ action: '*DELETE', tpId, catId });
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
