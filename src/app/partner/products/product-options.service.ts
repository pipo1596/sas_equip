import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProductOption } from './product.model';

@Injectable({ providedIn: 'root' })
export class ProductOptionsService {
  private readonly endpoint =
    `${environment.apiBaseUrl}${environment.endpoints.productOptions}`;

  async list(tpId: number, productPk: number): Promise<ProductOption[]> {
    const data = await this.post({ action: '*LIST_OPTS', tpId, productPk });
    return (data['data'] as unknown as ProductOption[]) ?? [];
  }

  async save(tpId: number, productPk: number, options: Array<{
    optId?: number;
    optName: string;
    optValue: string;
    optDescr?: string;
    optColor?: string | null;
    sortOrder: number;
  }>): Promise<string> {
    const data = await this.post({ action: '*SAVE_OPTS', tpId, productPk, options });
    return String(data['message'] ?? 'Saved.');
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
