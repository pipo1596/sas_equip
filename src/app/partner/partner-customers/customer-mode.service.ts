import { Injectable, inject, signal } from '@angular/core';
import { CustomersService } from './customers.service';

export interface ActiveCustomer {
  custId: number;
  customerName: string;
}

const STORAGE_KEY = 'saas_customerMode';

@Injectable({ providedIn: 'root' })
export class CustomerModeService {
  private readonly customersService = inject(CustomersService);

  readonly activeCustomer = signal<ActiveCustomer | null>(this.readFromStorage());

  enter(customer: ActiveCustomer): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
    this.activeCustomer.set(customer);
  }

  exit(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.activeCustomer.set(null);
  }

  // Populates the active customer from the API when navigating in directly
  // (deep link / page refresh) rather than via the customers list.
  async ensure(tpId: number, custId: number): Promise<void> {
    if (this.activeCustomer()?.custId === custId) return;
    const customer = await this.customersService.get(tpId, custId);
    this.enter({ custId: customer.custId, customerName: customer.customerName });
  }

  private readFromStorage(): ActiveCustomer | null {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as ActiveCustomer) : null;
    } catch {
      return null;
    }
  }
}
