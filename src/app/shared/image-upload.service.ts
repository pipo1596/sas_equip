import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private readonly endpoint = environment.endpoints.imageUpload;

  async upload(
    fieldName: string,
    file: File,
    tpId: number,
    params?: Record<string, string | number>,
  ): Promise<string> {
    const body = new FormData();
    body.append('file', file);
    body.append('field_name', fieldName);
    body.append('tp_id', String(tpId));

    let url2 = this.endpoint;
    if (params && Object.keys(params).length > 0) {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      );
      url2 = `${url2}?${qs.toString()}`;
    }

    const response = await fetch(url2, {
      method: 'POST',
      body,
      credentials: 'include',
    });

    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      throw new Error('Invalid server response.');
    }

    if (!response.ok || data['success'] === false) {
      throw new Error(String(data['message'] ?? 'Upload failed.'));
    }

    const url = data['url'];
    if (typeof url !== 'string' || !url) {
      throw new Error('No URL returned from upload.');
    }
    return url;
  }
}
