import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerPriceListsService } from './customer-price-lists.service';
import {
  CustomerPriceList, CustomerPriceListItem, CustomerPriceListItemForm, SkuSearchResult,
} from './customer-price-list.model';

@Component({
  selector: 'app-customer-price-list-items',
  standalone: true,
  imports: [FormsModule, RouterModule, DecimalPipe],
  templateUrl: './customer-price-list-items.component.html',
})
export class CustomerPriceListItemsComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerPriceListsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly priceList = signal<CustomerPriceList | null>(null);
  readonly items = signal<CustomerPriceListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<CustomerPriceListItem | null>(null);

  readonly showItemModal = signal(false);
  readonly editingItem = signal<CustomerPriceListItem | null>(null);
  readonly savingItem = signal(false);
  readonly itemError = signal<string | null>(null);
  readonly itemForm = signal<CustomerPriceListItemForm>({ skuId: null, price: null, compareAtPrc: null, status: 'ACTIVE' });

  readonly skuSearchTerm = signal('');
  readonly skuSearchResults = signal<SkuSearchResult[]>([]);
  readonly skuSearching = signal(false);
  readonly selectedSku = signal<SkuSearchResult | null>(null);
  private skuSearchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly startRecord = computed(() => this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1);
  readonly endRecord = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  protected get customerId(): number | null {
    const idParam = this.route.snapshot.paramMap.get('customerId');
    return idParam ? Number(idParam) : null;
  }

  protected get priceListId(): number | null {
    const idParam = this.route.snapshot.paramMap.get('priceListId');
    return idParam ? Number(idParam) : null;
  }

  async ngOnInit(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (tpId && custId) await this.customerMode.ensure(tpId, custId);
    await this.loadPriceList();
    this.loadItems();
  }

  private async loadPriceList(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const priceListId = this.priceListId;
    if (!tpId || !custId || !priceListId) return;
    try {
      this.priceList.set(await this.service.get(tpId, custId, priceListId));
    } catch {
      this.error.set('Could not load price list.');
    }
  }

  async loadItems(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const priceListId = this.priceListId;
    if (!tpId || !custId || !priceListId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.listItems(tpId, custId, priceListId, {
        page: this.page(),
        pageSize: this.pageSize(),
        search: this.search(),
      });
      this.items.set(result.data);
      this.total.set(result.pagination.totalRows);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load items.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.loadItems(); }, 350);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadItems();
  }

  backToPriceLists(): void {
    this.router.navigate(['/partner', this.tpId, 'customers', this.customerId, 'price-lists']);
  }

  openAddItemModal(): void {
    this.editingItem.set(null);
    this.itemForm.set({ skuId: null, price: null, compareAtPrc: null, status: 'ACTIVE' });
    this.selectedSku.set(null);
    this.skuSearchTerm.set('');
    this.skuSearchResults.set([]);
    this.itemError.set(null);
    this.showItemModal.set(true);
  }

  openEditItemModal(item: CustomerPriceListItem): void {
    this.editingItem.set(item);
    this.itemForm.set({
      skuId: item.skuId,
      price: item.price,
      compareAtPrc: item.compareAtPrc,
      status: item.status,
    });
    this.selectedSku.set({
      skuId: item.skuId,
      skuCode: item.skuCode ?? '',
      productTitle: item.productTitle ?? '',
      basePrice: item.price,
    });
    this.itemError.set(null);
    this.showItemModal.set(true);
  }

  closeItemModal(): void {
    this.showItemModal.set(false);
    this.editingItem.set(null);
  }

  onSkuSearchChange(value: string): void {
    this.skuSearchTerm.set(value);
    this.selectedSku.set(null);
    this.itemForm.update(f => ({ ...f, skuId: null }));
    if (this.skuSearchTimer) clearTimeout(this.skuSearchTimer);
    if (!value.trim()) {
      this.skuSearchResults.set([]);
      return;
    }
    this.skuSearchTimer = setTimeout(() => this.runSkuSearch(value), 300);
  }

  private async runSkuSearch(term: string): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    this.skuSearching.set(true);
    try {
      this.skuSearchResults.set(await this.service.searchSkus(tpId, term));
    } catch {
      this.skuSearchResults.set([]);
    } finally {
      this.skuSearching.set(false);
    }
  }

  pickSku(sku: SkuSearchResult): void {
    this.selectedSku.set(sku);
    this.skuSearchResults.set([]);
    this.skuSearchTerm.set('');
    this.itemForm.update(f => ({
      ...f,
      skuId: sku.skuId,
      price: f.price ?? sku.basePrice,
    }));
  }

  clearSelectedSku(): void {
    this.selectedSku.set(null);
    this.itemForm.update(f => ({ ...f, skuId: null }));
  }

  async saveItem(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const priceListId = this.priceListId;
    const form = this.itemForm();
    if (!tpId || !custId || !priceListId) return;
    if (!form.skuId) {
      this.itemError.set('Please select a SKU.');
      return;
    }
    if (form.price == null || form.price < 0) {
      this.itemError.set('Please enter a valid price.');
      return;
    }

    this.savingItem.set(true);
    this.itemError.set(null);
    try {
      const editing = this.editingItem();
      if (editing) {
        await this.service.updateItem(tpId, custId, priceListId, editing.itemId, form);
      } else {
        await this.service.createItem(tpId, custId, priceListId, form);
      }
      this.closeItemModal();
      await this.loadItems();
    } catch (err) {
      this.itemError.set(err instanceof Error ? err.message : 'Failed to save item.');
    } finally {
      this.savingItem.set(false);
    }
  }

  openDeleteModal(item: CustomerPriceListItem): void {
    this.deleteTarget.set(item);
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
    const priceListId = this.priceListId;
    if (!target || !tpId || !custId || !priceListId) return;
    this.deleting.set(true);
    try {
      await this.service.removeItem(tpId, custId, priceListId, target.itemId);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      if (this.items().length === 1 && this.page() > 1) this.page.update(p => p - 1);
      await this.loadItems();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Delete failed.');
      this.closeDeleteModal();
    } finally {
      this.deleting.set(false);
    }
  }

  statusBadge(status: string): string {
    return status === 'ACTIVE'
      ? 'badge bg-success-subtle text-success border border-success-subtle'
      : 'badge bg-secondary-subtle text-secondary border border-secondary-subtle';
  }
}
