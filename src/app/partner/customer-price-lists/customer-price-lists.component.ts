import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerPriceListsService } from './customer-price-lists.service';
import { CustomerPriceList } from './customer-price-list.model';

@Component({
  selector: 'app-customer-price-lists',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './customer-price-lists.component.html',
})
export class CustomerPriceListsComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerPriceListsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly priceLists = signal<CustomerPriceList[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly search = signal('');
  readonly statusFilter = signal<'ALL' | 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED'>('ALL');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<CustomerPriceList | null>(null);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  readonly pageWindow = computed(() => {
    const tp = this.totalPages();
    const p = this.page();
    const start = Math.max(1, Math.min(p - 2, tp - 4));
    const end = Math.min(tp, Math.max(p + 2, 5));
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  readonly startRecord = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1
  );

  readonly endRecord = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total())
  );

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  protected get customerId(): number | null {
    const idParam = this.route.snapshot.paramMap.get('customerId');
    return idParam ? Number(idParam) : null;
  }

  async ngOnInit(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (tpId && custId) await this.customerMode.ensure(tpId, custId);
    this.loadPriceLists();
  }

  async loadPriceLists(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list(tpId, custId, {
        page: this.page(),
        pageSize: this.pageSize(),
        search: this.search(),
        status: this.statusFilter() === 'ALL' ? undefined : this.statusFilter(),
      });
      this.priceLists.set(result.data);
      this.total.set(result.pagination.totalRows);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load price lists.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.loadPriceLists(); }, 350);
  }

  onStatusFilterChange(value: 'ALL' | 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED'): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.loadPriceLists();
  }

  onPageSizeChange(value: string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
    this.loadPriceLists();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadPriceLists();
  }

  newPriceList(): void {
    this.router.navigate(['/partner', this.tpId, 'customers', this.customerId, 'price-lists', 'new']);
  }

  editPriceList(priceList: CustomerPriceList): void {
    this.router.navigate(
      ['/partner', this.tpId, 'customers', this.customerId, 'price-lists', priceList.priceListId, 'edit'],
      { state: { priceList } },
    );
  }

  manageItems(priceList: CustomerPriceList): void {
    this.router.navigate(
      ['/partner', this.tpId, 'customers', this.customerId, 'price-lists', priceList.priceListId, 'items'],
      { state: { priceList } },
    );
  }

  openDeleteModal(priceList: CustomerPriceList): void {
    this.deleteTarget.set(priceList);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!target || !tpId || !custId) return;
    this.deleting.set(true);
    try {
      await this.service.remove(tpId, custId, target.priceListId);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      if (this.priceLists().length === 1 && this.page() > 1) this.page.update(p => p - 1);
      await this.loadPriceLists();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Delete failed.');
      this.closeDeleteModal();
    } finally {
      this.deleting.set(false);
    }
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'badge bg-success-subtle text-success border border-success-subtle';
      case 'DRAFT': return 'badge bg-secondary-subtle text-secondary border border-secondary-subtle';
      case 'EXPIRED': return 'badge bg-danger-subtle text-danger border border-danger-subtle';
      default: return 'badge bg-light text-dark border';
    }
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return d;
    }
  }
}
