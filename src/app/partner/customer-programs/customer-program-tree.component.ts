import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerProgramsService } from './customer-programs.service';
import {
  CustomerProgram, CustomerProgramCategoryNode, CustomerProgramSku, CustomerProgramSkuCandidate,
} from './customer-program.model';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/category.model';

interface ParentOption {
  progCatId: number;
  categoryName: string;
  level: number;
}

interface ProductGroup {
  key: string;
  progCatId: number;
  productPk: number;
  productTitle: string;
  skus: CustomerProgramSku[];
}

interface TreeRow {
  kind: 'CATEGORY' | 'PRODUCT_GROUP' | 'SKU';
  level: number;
  key: string;
  category?: CustomerProgramCategoryNode;
  group?: ProductGroup;
  sku?: CustomerProgramSku;
}

@Component({
  selector: 'app-customer-program-tree',
  standalone: true,
  imports: [FormsModule, RouterModule, DecimalPipe],
  templateUrl: './customer-program-tree.component.html',
})
export class CustomerProgramTreeComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerProgramsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly program = signal<CustomerProgram | null>(null);
  readonly categories = signal<CustomerProgramCategoryNode[]>([]);
  readonly categoryCount = signal(0);
  readonly skuCount = signal(0);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly search = signal('');
  readonly expandedIds = signal<Set<number>>(new Set());
  readonly expandedGroupKeys = signal<Set<string>>(new Set());

  readonly showDeleteCategoryModal = signal(false);
  readonly deletingCategory = signal(false);
  readonly deleteCategoryTarget = signal<CustomerProgramCategoryNode | null>(null);

  readonly showAddCategoryModal = signal(false);
  readonly savingCategory = signal(false);
  readonly addCategoryError = signal<string | null>(null);
  readonly catalogCategories = signal<Category[]>([]);
  readonly loadingCatalogCategories = signal(false);
  readonly selectedParentProgCatId = signal<number | null>(null);
  readonly selectedCategoryId = signal<number | null>(null);

  readonly showAddSkuModal = signal(false);
  readonly addSkuTarget = signal<CustomerProgramCategoryNode | null>(null);
  readonly savingSku = signal(false);
  readonly addSkuError = signal<string | null>(null);
  readonly skuSearch = signal('');
  readonly skuSearchResults = signal<CustomerProgramSkuCandidate[]>([]);
  readonly skuSearching = signal(false);
  readonly selectedSkuIds = signal<Set<number>>(new Set());

  readonly showDeleteSkuModal = signal(false);
  readonly deletingSku = signal(false);
  readonly deleteSkuTarget = signal<CustomerProgramSku | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private skuSearchTimer: ReturnType<typeof setTimeout> | null = null;

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  protected get customerId(): number | null {
    const idParam = this.route.snapshot.paramMap.get('customerId');
    return idParam ? Number(idParam) : null;
  }

  protected get programId(): number | null {
    const idParam = this.route.snapshot.paramMap.get('programId');
    return idParam ? Number(idParam) : null;
  }

  readonly rows = computed(() => {
    const term = this.search().trim().toLowerCase();
    const expandedCats = this.expandedIds();
    const expandedGroups = this.expandedGroupKeys();
    const filtering = term.length > 0;
    const rows: TreeRow[] = [];

    const matches = (text: string | null) => !!text && text.toLowerCase().includes(term);
    const skuMatches = (sku: CustomerProgramSku) => matches(sku.productTitle) || matches(sku.skuCode);

    const categoryMatches = (cat: CustomerProgramCategoryNode): boolean =>
      matches(cat.categoryName) ||
      cat.skus.some(skuMatches) ||
      cat.children.some(categoryMatches);

    const groupSkusByProduct = (skus: CustomerProgramSku[]): ProductGroup[] => {
      const byProduct = new Map<number, ProductGroup>();
      const order: ProductGroup[] = [];
      for (const sku of skus) {
        let group = byProduct.get(sku.productPk);
        if (!group) {
          group = { key: `g${sku.progCatId}-${sku.productPk}`, progCatId: sku.progCatId, productPk: sku.productPk, productTitle: sku.productTitle, skus: [] };
          byProduct.set(sku.productPk, group);
          order.push(group);
        }
        group.skus.push(sku);
      }
      return order;
    };

    const visit = (cat: CustomerProgramCategoryNode, level: number) => {
      if (filtering && !categoryMatches(cat)) return;
      rows.push({ kind: 'CATEGORY', level, key: 'c' + cat.progCatId, category: cat });
      const isCatOpen = filtering || expandedCats.has(cat.progCatId);
      if (!isCatOpen) return;
      for (const child of cat.children) visit(child, level + 1);

      for (const group of groupSkusByProduct(cat.skus)) {
        const visibleSkus = filtering ? group.skus.filter(skuMatches) : group.skus;
        if (filtering && visibleSkus.length === 0) continue;
        rows.push({ kind: 'PRODUCT_GROUP', level: level + 1, key: group.key, group: { ...group, skus: visibleSkus } });
        const isGroupOpen = filtering || expandedGroups.has(group.key);
        if (!isGroupOpen) continue;
        for (const sku of visibleSkus) {
          rows.push({ kind: 'SKU', level: level + 2, key: 's' + sku.progProdId, sku });
        }
      }
    };

    for (const cat of this.categories()) visit(cat, 0);
    return rows;
  });

  async ngOnInit(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (tpId && custId) await this.customerMode.ensure(tpId, custId);
    await this.loadProgram();
    await this.loadTree();
  }

  private async loadProgram(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    if (!tpId || !custId || !programId) return;
    try {
      this.program.set(await this.service.get(tpId, custId, programId));
    } catch {
      this.error.set('Could not load program.');
    }
  }

  async loadTree(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    if (!tpId || !custId || !programId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const tree = await this.service.getTree(tpId, custId, programId);
      this.categories.set(tree.categories);
      this.categoryCount.set(tree.categoryCount);
      this.skuCount.set(tree.skuCount);
      this.expandedIds.set(new Set(this.allCategoryIds()));
      this.expandedGroupKeys.set(new Set());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load program tree.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.search.set(value), 200);
  }

  private allCategoryIds(): number[] {
    const ids: number[] = [];
    const visit = (cat: CustomerProgramCategoryNode) => {
      ids.push(cat.progCatId);
      cat.children.forEach(visit);
    };
    this.categories().forEach(visit);
    return ids;
  }

  private allGroupKeys(): string[] {
    const keys: string[] = [];
    const visit = (cat: CustomerProgramCategoryNode) => {
      const seen = new Set<number>();
      for (const sku of cat.skus) {
        if (seen.has(sku.productPk)) continue;
        seen.add(sku.productPk);
        keys.push(`g${cat.progCatId}-${sku.productPk}`);
      }
      cat.children.forEach(visit);
    };
    this.categories().forEach(visit);
    return keys;
  }

  expandAll(): void {
    this.expandedIds.set(new Set(this.allCategoryIds()));
    this.expandedGroupKeys.set(new Set(this.allGroupKeys()));
  }

  collapseAll(): void {
    this.expandedIds.set(new Set());
    this.expandedGroupKeys.set(new Set());
  }

  toggleExpand(progCatId: number): void {
    this.expandedIds.update(set => {
      const next = new Set(set);
      next.has(progCatId) ? next.delete(progCatId) : next.add(progCatId);
      return next;
    });
  }

  toggleGroupExpand(key: string): void {
    this.expandedGroupKeys.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  groupBasePriceRange(group: ProductGroup): string {
    return this.priceRange(group.skus.map(s => s.basePrice));
  }

  groupCustomerPriceRange(group: ProductGroup): string {
    return this.priceRange(group.skus.map(s => s.customerPrice ?? s.basePrice));
  }

  groupHasDiscount(group: ProductGroup): boolean {
    return group.skus.some(s => s.customerPrice != null && s.customerPrice !== s.basePrice);
  }

  private priceRange(values: Array<number | null>): string {
    const nums = values.filter((v): v is number => v != null);
    if (nums.length === 0) return '—';
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  }

  readonly parentOptions = computed<ParentOption[]>(() => {
    const options: ParentOption[] = [];
    const visit = (cat: CustomerProgramCategoryNode, level: number) => {
      options.push({ progCatId: cat.progCatId, categoryName: cat.categoryName, level });
      cat.children.forEach(child => visit(child, level + 1));
    };
    this.categories().forEach(cat => visit(cat, 0));
    return options;
  });

  private readonly usedCatalogCategoryIds = computed(() => {
    const ids = new Set<number>();
    const visit = (cat: CustomerProgramCategoryNode) => {
      ids.add(cat.categoryId);
      cat.children.forEach(visit);
    };
    this.categories().forEach(visit);
    return ids;
  });

  readonly availableCatalogCategories = computed(() =>
    this.catalogCategories().filter(c => !this.usedCatalogCategoryIds().has(c.catId))
  );

  async openAddCategoryModal(parentProgCatId: number | null = null): Promise<void> {
    this.selectedParentProgCatId.set(parentProgCatId);
    this.selectedCategoryId.set(null);
    this.addCategoryError.set(null);
    this.showAddCategoryModal.set(true);
    if (this.catalogCategories().length === 0) {
      const tpId = this.tpId;
      if (!tpId) return;
      this.loadingCatalogCategories.set(true);
      try {
        this.catalogCategories.set(await this.categoriesService.listAll(tpId));
      } catch {
        this.addCategoryError.set('Failed to load catalog categories.');
      } finally {
        this.loadingCatalogCategories.set(false);
      }
    }
  }

  closeAddCategoryModal(): void {
    this.showAddCategoryModal.set(false);
  }

  async saveAddCategory(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    const categoryId = this.selectedCategoryId();
    if (!tpId || !custId || !programId) return;
    if (!categoryId) {
      this.addCategoryError.set('Please select a category.');
      return;
    }
    this.savingCategory.set(true);
    this.addCategoryError.set(null);
    try {
      await this.service.addCategory(tpId, custId, programId, {
        categoryId,
        parentProgCatId: this.selectedParentProgCatId(),
      });
      this.closeAddCategoryModal();
      await this.loadTree();
    } catch (err) {
      this.addCategoryError.set(err instanceof Error ? err.message : 'Failed to add category.');
    } finally {
      this.savingCategory.set(false);
    }
  }

  openDeleteCategoryModal(category: CustomerProgramCategoryNode): void {
    this.deleteCategoryTarget.set(category);
    this.showDeleteCategoryModal.set(true);
  }

  closeDeleteCategoryModal(): void {
    this.showDeleteCategoryModal.set(false);
    this.deleteCategoryTarget.set(null);
  }

  async confirmDeleteCategory(): Promise<void> {
    const target = this.deleteCategoryTarget();
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    if (!target || !tpId || !custId || !programId) return;
    this.deletingCategory.set(true);
    try {
      await this.service.removeCategory(tpId, custId, programId, target.progCatId);
      this.closeDeleteCategoryModal();
      await this.loadTree();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to delete category.');
      this.closeDeleteCategoryModal();
    } finally {
      this.deletingCategory.set(false);
    }
  }

  countCategoryDescendants(category: CustomerProgramCategoryNode): { categories: number; skus: number } {
    let categories = 0;
    let skus = 0;
    const visit = (cat: CustomerProgramCategoryNode) => {
      categories++;
      skus += cat.skus.length;
      cat.children.forEach(visit);
    };
    visit(category);
    return { categories: categories - 1, skus };
  }

  async openAddSkuModal(category: CustomerProgramCategoryNode): Promise<void> {
    this.addSkuTarget.set(category);
    this.selectedSkuIds.set(new Set());
    this.skuSearch.set('');
    this.addSkuError.set(null);
    this.showAddSkuModal.set(true);
    await this.runSkuSearch('');
  }

  closeAddSkuModal(): void {
    this.showAddSkuModal.set(false);
    this.addSkuTarget.set(null);
    this.skuSearchResults.set([]);
  }

  onSkuSearchChange(value: string): void {
    this.skuSearch.set(value);
    if (this.skuSearchTimer) clearTimeout(this.skuSearchTimer);
    this.skuSearchTimer = setTimeout(() => this.runSkuSearch(value), 300);
  }

  private async runSkuSearch(term: string): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    const target = this.addSkuTarget();
    if (!tpId || !custId || !programId || !target) return;
    this.skuSearching.set(true);
    try {
      this.skuSearchResults.set(await this.service.searchSkus(tpId, custId, programId, target.progCatId, term));
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

  toggleSelectAllSkus(): void {
    const results = this.skuSearchResults();
    const allSelected = results.length > 0 && results.every(s => this.selectedSkuIds().has(s.skuId));
    this.selectedSkuIds.set(allSelected ? new Set() : new Set(results.map(s => s.skuId)));
  }

  async saveAddSku(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    const target = this.addSkuTarget();
    const skuIds = Array.from(this.selectedSkuIds());
    if (!tpId || !custId || !programId || !target) return;
    if (skuIds.length === 0) {
      this.addSkuError.set('Please select at least one SKU.');
      return;
    }
    this.savingSku.set(true);
    this.addSkuError.set(null);
    try {
      await this.service.addSkus(tpId, custId, programId, target.progCatId, skuIds);
      this.closeAddSkuModal();
      await this.loadTree();
    } catch (err) {
      this.addSkuError.set(err instanceof Error ? err.message : 'Failed to add SKUs.');
    } finally {
      this.savingSku.set(false);
    }
  }

  openDeleteSkuModal(sku: CustomerProgramSku): void {
    this.deleteSkuTarget.set(sku);
    this.showDeleteSkuModal.set(true);
  }

  closeDeleteSkuModal(): void {
    this.showDeleteSkuModal.set(false);
    this.deleteSkuTarget.set(null);
  }

  async confirmDeleteSku(): Promise<void> {
    const target = this.deleteSkuTarget();
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    if (!target || !tpId || !custId || !programId) return;
    this.deletingSku.set(true);
    try {
      await this.service.removeSku(tpId, custId, programId, target.progProdId);
      this.closeDeleteSkuModal();
      await this.loadTree();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to remove SKU.');
      this.closeDeleteSkuModal();
    } finally {
      this.deletingSku.set(false);
    }
  }

  backToPrograms(): void {
    this.router.navigate(['/partner', this.tpId, 'customers', this.customerId, 'uniform-programs']);
  }

  formatDate(d: string | null): string {
    if (!d) return 'Never';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  }

  truncateTitle(text: string, max = 30): string {
    return text.length > max ? text.slice(0, max) + '…' : text;
  }
}
