import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerPriceListsService } from './customer-price-lists.service';
import {
  CustomerPriceList, CustomerPriceListItem, SkuSearchResult,
} from './customer-price-list.model';

interface ItemDraft {
  price: number | null;
  compareAtPrc: number | null;
  points: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

interface SkuRow {
  sku: SkuSearchResult;
  isFirstInGroup: boolean;
  groupIndex: number;
}

@Component({
  selector: 'app-customer-price-list-items',
  standalone: true,
  imports: [FormsModule, RouterModule, DecimalPipe, CurrencyPipe],
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

  // Edit existing item — SKU is fixed, only price/compareAtPrc/status change.
  readonly showEditItemModal = signal(false);
  readonly editTarget = signal<CustomerPriceListItem | null>(null);
  readonly editForm = signal<ItemDraft>({ price: null, compareAtPrc: null, points: null, status: 'ACTIVE' });
  readonly savingEdit = signal(false);
  readonly editError = signal<string | null>(null);

  // Add items — search, multi-select via checkboxes, each row has its own
  // editable price/compareAtPrc/status.
  readonly showAddItemsModal = signal(false);
  readonly savingItems = signal(false);
  readonly addItemsError = signal<string | null>(null);
  readonly skuSearchTerm = signal('');
  readonly skuSearchResults = signal<SkuSearchResult[]>([]);
  readonly skuSearching = signal(false);
  readonly selectedSkuIds = signal<Set<number>>(new Set());
  readonly skuDrafts = signal<Map<number, ItemDraft>>(new Map());
  private skuSearchTimer: ReturnType<typeof setTimeout> | null = null;

  // Regroups search results so every SKU of the same product sits adjacent
  // (the API doesn't guarantee that ordering), for the grouped-background
  // striping and the per-group "apply to all" affordance in the picker.
  readonly groupedSkuRows = computed<SkuRow[]>(() => {
    const byProduct = new Map<number, SkuSearchResult[]>();
    const order: number[] = [];
    for (const sku of this.skuSearchResults()) {
      let group = byProduct.get(sku.productPk);
      if (!group) {
        group = [];
        byProduct.set(sku.productPk, group);
        order.push(sku.productPk);
      }
      group.push(sku);
    }
    const rows: SkuRow[] = [];
    order.forEach((productPk, groupIndex) => {
      byProduct.get(productPk)!.forEach((sku, i) => {
        rows.push({ sku, isFirstInGroup: i === 0, groupIndex });
      });
    });
    return rows;
  });

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

  // ── Edit existing item ────────────────────────────────────────────────────

  openEditItemModal(item: CustomerPriceListItem): void {
    this.editTarget.set(item);
    this.editForm.set({ price: item.price, compareAtPrc: item.compareAtPrc, points: item.points, status: item.status });
    this.editError.set(null);
    this.showEditItemModal.set(true);
  }

  closeEditItemModal(): void {
    this.showEditItemModal.set(false);
    this.editTarget.set(null);
  }

  async saveEditItem(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const priceListId = this.priceListId;
    const target = this.editTarget();
    const form = this.editForm();
    if (!tpId || !custId || !priceListId || !target) return;
    if (form.price == null || form.price <= 0) {
      this.editError.set('Please enter a price greater than 0.');
      return;
    }
    this.savingEdit.set(true);
    this.editError.set(null);
    try {
      await this.service.updateItem(tpId, custId, priceListId, target.itemId, {
        skuId: target.skuId,
        price: form.price,
        compareAtPrc: form.compareAtPrc,
        points: form.points,
        status: form.status,
      });
      this.closeEditItemModal();
      await this.loadItems();
    } catch (err) {
      this.editError.set(err instanceof Error ? err.message : 'Failed to save item.');
    } finally {
      this.savingEdit.set(false);
    }
  }

  // ── Add items (bulk) ─────────────────────────────────────────────────────

  openAddItemsModal(): void {
    this.selectedSkuIds.set(new Set());
    this.skuDrafts.set(new Map());
    this.skuSearchTerm.set('');
    this.skuSearchResults.set([]);
    this.addItemsError.set(null);
    this.showAddItemsModal.set(true);
  }

  closeAddItemsModal(): void {
    this.showAddItemsModal.set(false);
  }

  onSkuSearchChange(value: string): void {
    this.skuSearchTerm.set(value);
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
      const results = await this.service.searchSkus(tpId, term);
      this.skuSearchResults.set(results);
      this.skuDrafts.update(map => {
        const next = new Map(map);
        for (const sku of results) {
          if (!next.has(sku.skuId)) {
            next.set(sku.skuId, { price: sku.basePrice, compareAtPrc: null, points: null, status: 'ACTIVE' });
          }
        }
        return next;
      });
    } catch {
      this.skuSearchResults.set([]);
    } finally {
      this.skuSearching.set(false);
    }
  }

  // Checking a SKU also checks its sibling SKUs from the same product (the
  // common case — you usually want every size/color of a style, not one).
  // Unchecking only affects that single SKU, so a peer can still be
  // excluded after the fact.
  toggleSkuSelected(skuId: number): void {
    const results = this.skuSearchResults();
    const sku = results.find(s => s.skuId === skuId);
    this.selectedSkuIds.update(set => {
      const next = new Set(set);
      if (next.has(skuId)) {
        next.delete(skuId);
      } else {
        next.add(skuId);
        if (sku) {
          for (const peer of results) {
            if (peer.productPk === sku.productPk) next.add(peer.skuId);
          }
        }
      }
      return next;
    });
  }

  draftFor(skuId: number): ItemDraft {
    return this.skuDrafts().get(skuId) ?? { price: null, compareAtPrc: null, points: null, status: 'ACTIVE' };
  }

  updateDraft(skuId: number, patch: Partial<ItemDraft>): void {
    this.skuDrafts.update(map => {
      const next = new Map(map);
      next.set(skuId, { ...this.draftFor(skuId), ...patch });
      return next;
    });
  }

  // Spreads one field's value from a product's first SKU row to every other
  // visible SKU of that same product.
  applyToGroup(sku: SkuSearchResult, field: 'price' | 'compareAtPrc' | 'points'): void {
    const value = this.draftFor(sku.skuId)[field];
    const peers = this.skuSearchResults().filter(s => s.productPk === sku.productPk && s.skuId !== sku.skuId);
    this.skuDrafts.update(map => {
      const next = new Map(map);
      for (const peer of peers) {
        next.set(peer.skuId, { ...this.draftFor(peer.skuId), [field]: value });
      }
      return next;
    });
  }

  async saveAddItems(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const priceListId = this.priceListId;
    if (!tpId || !custId || !priceListId) return;

    const selected = Array.from(this.selectedSkuIds());
    if (selected.length === 0) {
      this.addItemsError.set('Please select at least one SKU.');
      return;
    }
    const drafts = this.skuDrafts();
    for (const skuId of selected) {
      const draft = drafts.get(skuId);
      if (!draft || draft.price == null || draft.price <= 0) {
        this.addItemsError.set('Please enter a price greater than 0 for every selected SKU.');
        return;
      }
    }

    this.savingItems.set(true);
    this.addItemsError.set(null);
    try {
      const items = selected.map(skuId => {
        const draft = drafts.get(skuId)!;
        return { skuId, price: draft.price as number, compareAtPrc: draft.compareAtPrc, points: draft.points, status: draft.status };
      });
      await this.service.createItems(tpId, custId, priceListId, items);
      this.closeAddItemsModal();
      await this.loadItems();
    } catch (err) {
      this.addItemsError.set(err instanceof Error ? err.message : 'Failed to add items.');
    } finally {
      this.savingItems.set(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

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
