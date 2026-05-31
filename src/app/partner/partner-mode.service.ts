import { Injectable, signal } from '@angular/core';

export interface ActivePartner {
  tpId: number;
  tpName: string;
}

const STORAGE_KEY = 'saas_partnerMode';

@Injectable({ providedIn: 'root' })
export class PartnerModeService {
  readonly activePartner = signal<ActivePartner | null>(this.readFromStorage());

  enter(partner: ActivePartner): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(partner));
    this.activePartner.set(partner);
  }

  exit(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.activePartner.set(null);
  }

  private readFromStorage(): ActivePartner | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as ActivePartner) : null;
    } catch {
      return null;
    }
  }
}
