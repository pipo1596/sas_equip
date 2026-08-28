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
import { isDisplayableImageUrl } from '../../shared/image-url.util';

interface ParentOption {
  progCatId: number;
  categoryName: string;
  level: number;
  breadcrumb: string;
}

interface ProductGroup {
  key: string;
  progCatId: number;
  productPk: number;
  productId: number;
  productTitle: string;
  productImageUrl: string | null;
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

  readonly showEditCategoryModal = signal(false);
  readonly savingEditCategory = signal(false);
  readonly editCategoryError = signal<string | null>(null);
  readonly editCategoryTarget = signal<CustomerProgramCategoryNode | null>(null);
  readonly editCategoryName = signal('');

  readonly showReassignModal = signal(false);
  readonly savingReassign = signal(false);
  readonly reassignError = signal<string | null>(null);
  readonly reassignSourceTarget = signal<ProductGroup | null>(null);
  readonly reassignTargetProgCatId = signal<number | null>(null);

  readonly showReparentModal = signal(false);
  readonly savingReparent = signal(false);
  readonly reparentError = signal<string | null>(null);
  readonly reparentSourceTarget = signal<CustomerProgramCategoryNode | null>(null);
  readonly reparentTargetProgCatId = signal<number | null>(null);

  readonly showAddCategoryModal = signal(false);
  readonly savingCategory = signal(false);
  readonly addCategoryError = signal<string | null>(null);
  readonly catalogCategories = signal<Category[]>([]);
  readonly loadingCatalogCategories = signal(false);
  readonly selectedParentProgCatId = signal<number | null>(null);
  readonly selectedCategoryId = signal<number | null>(null);
  readonly categoryNameMode = signal<'CATALOG' | 'CUSTOM'>('CATALOG');
  readonly customCategoryName = signal('');

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

  readonly showDeleteGroupModal = signal(false);
  readonly deletingGroup = signal(false);
  readonly deleteGroupTarget = signal<ProductGroup | null>(null);

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
          group = { key: `g${sku.progCatId}-${sku.productPk}`, progCatId: sku.progCatId, productPk: sku.productPk, productId: sku.productId, productTitle: sku.productTitle, productImageUrl: sku.productImageUrl, skus: [] };
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

      // Collapsed by default on first-ever visit to a program; on later
      // loads (including a hard refresh), restore whatever was expanded —
      // dropping any ids/keys that no longer exist in the reloaded tree.
      const validCatIds = new Set(this.allCategoryIds());
      const validGroupKeys = new Set(this.allGroupKeys());
      const saved = this.loadExpandedState();
      this.expandedIds.set(new Set([...(saved?.categories ?? [])].filter(id => validCatIds.has(id))));
      this.expandedGroupKeys.set(new Set([...(saved?.groups ?? [])].filter(k => validGroupKeys.has(k))));
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
    this.saveExpandedState();
  }

  collapseAll(): void {
    this.expandedIds.set(new Set());
    this.expandedGroupKeys.set(new Set());
    this.saveExpandedState();
  }

  // Persists which assortments/product groups are expanded, per program, so
  // it survives a refresh — sessionStorage rather than component state
  // since loadTree() re-fetches the whole tree from scratch on every load.
  private expandedStateKey(): string | null {
    const programId = this.programId;
    return programId ? `saas_programTreeExpanded_${programId}` : null;
  }

  private saveExpandedState(): void {
    const key = this.expandedStateKey();
    if (!key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify({
        categories: Array.from(this.expandedIds()),
        groups: Array.from(this.expandedGroupKeys()),
      }));
    } catch { /* non-critical */ }
  }

  private loadExpandedState(): { categories: number[]; groups: string[] } | null {
    const key = this.expandedStateKey();
    if (!key) return null;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as { categories: number[]; groups: string[] };
    } catch {
      return null;
    }
  }

  toggleExpand(progCatId: number): void {
    this.expandedIds.update(set => {
      const next = new Set(set);
      next.has(progCatId) ? next.delete(progCatId) : next.add(progCatId);
      return next;
    });
    this.saveExpandedState();
  }

  toggleGroupExpand(key: string): void {
    this.expandedGroupKeys.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    this.saveExpandedState();
  }

  categoryBreadcrumbFor(progCatId: number): string {
    return this.parentOptions().find(o => o.progCatId === progCatId)?.breadcrumb ?? '';
  }

  groupBasePriceRange(group: ProductGroup): string {
    return this.priceRange(group.skus.map(s => s.basePrice));
  }

  groupCustomerPriceRange(group: ProductGroup): string {
    return this.priceRange(group.skus.map(s => s.customerPrice ?? s.basePrice));
  }

  groupPointsRange(group: ProductGroup): string {
    return this.numberRange(group.skus.map(s => s.points), 0);
  }

  groupHasDiscount(group: ProductGroup): boolean {
    return group.skus.some(s => s.customerPrice != null && s.customerPrice !== s.basePrice);
  }

  private priceRange(values: Array<number | null>): string {
    return this.numberRange(values, 2);
  }

  private numberRange(values: Array<number | null>, decimals: number): string {
    const nums = values.filter((v): v is number => v != null);
    if (nums.length === 0) return '—';
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  }

  readonly parentOptions = computed<ParentOption[]>(() => {
    const options: ParentOption[] = [];
    const visit = (cat: CustomerProgramCategoryNode, level: number, path: string[]) => {
      const breadcrumb = [...path, cat.categoryName].join(' › ');
      options.push({ progCatId: cat.progCatId, categoryName: cat.categoryName, level, breadcrumb });
      cat.children.forEach(child => visit(child, level + 1, [...path, cat.categoryName]));
    };
    this.categories().forEach(cat => visit(cat, 0, []));
    return options;
  });

  private readonly allLeafOptions = computed<ParentOption[]>(() => {
    const options: ParentOption[] = [];
    const visit = (cat: CustomerProgramCategoryNode, level: number, path: string[]) => {
      const breadcrumb = [...path, cat.categoryName].join(' › ');
      if (cat.children.length === 0) options.push({ progCatId: cat.progCatId, categoryName: cat.categoryName, level, breadcrumb });
      cat.children.forEach(child => visit(child, level + 1, [...path, cat.categoryName]));
    };
    this.categories().forEach(cat => visit(cat, 0, []));
    return options;
  });

  reassignTargetOptions(): ParentOption[] {
    const sourceId = this.reassignSourceTarget()?.progCatId;
    return this.allLeafOptions().filter(o => o.progCatId !== sourceId);
  }

  // A category can't be re-parented into itself or one of its own
  // descendants — that would create a cycle in the tree.
  private descendantProgCatIds(category: CustomerProgramCategoryNode): Set<number> {
    const ids = new Set<number>();
    const visit = (cat: CustomerProgramCategoryNode) => {
      ids.add(cat.progCatId);
      cat.children.forEach(visit);
    };
    visit(category);
    return ids;
  }

  // Only categories with no items of their own can receive a re-parented
  // category — mirrors the rule that a category holding SKUs can't also
  // hold sub-assortments (see the Add Sub-Assortment button's condition).
  private readonly categoriesWithItems = computed(() => {
    const ids = new Set<number>();
    const visit = (cat: CustomerProgramCategoryNode) => {
      if (cat.skus.length > 0) ids.add(cat.progCatId);
      cat.children.forEach(visit);
    };
    this.categories().forEach(visit);
    return ids;
  });

  reparentTargetOptions(): ParentOption[] {
    const source = this.reparentSourceTarget();
    if (!source) return [];
    const excluded = this.descendantProgCatIds(source);
    const withItems = this.categoriesWithItems();
    return this.parentOptions().filter(o =>
      !excluded.has(o.progCatId) && !withItems.has(o.progCatId) && o.progCatId !== source.parentProgCatId
    );
  }

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
    this.categoryNameMode.set('CATALOG');
    this.customCategoryName.set('');
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
    if (!tpId || !custId || !programId) return;

    let categoryName: string;
    if (this.categoryNameMode() === 'CUSTOM') {
      categoryName = this.customCategoryName().trim();
      if (!categoryName) {
        this.addCategoryError.set('Please enter an assortment name.');
        return;
      }
    } else {
      const categoryId = this.selectedCategoryId();
      const category = categoryId != null ? this.catalogCategories().find(c => c.catId === categoryId) : undefined;
      if (!category) {
        this.addCategoryError.set('Please select a category.');
        return;
      }
      categoryName = category.catName;
    }

    this.savingCategory.set(true);
    this.addCategoryError.set(null);
    try {
      await this.service.addCategory(tpId, custId, programId, {
        categoryName,
        parentProgCatId: this.selectedParentProgCatId(),
      });
      this.closeAddCategoryModal();
      await this.loadTree();
    } catch (err) {
      this.addCategoryError.set(err instanceof Error ? err.message : 'Failed to add assortment.');
    } finally {
      this.savingCategory.set(false);
    }
  }

  openEditCategoryModal(category: CustomerProgramCategoryNode): void {
    this.editCategoryTarget.set(category);
    this.editCategoryName.set(category.categoryName);
    this.editCategoryError.set(null);
    this.showEditCategoryModal.set(true);
  }

  closeEditCategoryModal(): void {
    this.showEditCategoryModal.set(false);
    this.editCategoryTarget.set(null);
  }

  async saveEditCategory(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    const target = this.editCategoryTarget();
    if (!tpId || !custId || !programId || !target) return;
    const categoryName = this.editCategoryName().trim();
    if (!categoryName) {
      this.editCategoryError.set('Please enter an assortment name.');
      return;
    }
    this.savingEditCategory.set(true);
    this.editCategoryError.set(null);
    try {
      await this.service.updateCategory(tpId, custId, programId, target.progCatId, categoryName);
      this.closeEditCategoryModal();
      await this.loadTree();
    } catch (err) {
      this.editCategoryError.set(err instanceof Error ? err.message : 'Failed to update assortment.');
    } finally {
      this.savingEditCategory.set(false);
    }
  }

  openReassignModal(group: ProductGroup): void {
    this.reassignSourceTarget.set(group);
    this.reassignTargetProgCatId.set(null);
    this.reassignError.set(null);
    this.showReassignModal.set(true);
  }

  closeReassignModal(): void {
    this.showReassignModal.set(false);
    this.reassignSourceTarget.set(null);
  }

  async confirmReassign(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    const source = this.reassignSourceTarget();
    const targetProgCatId = this.reassignTargetProgCatId();
    if (!tpId || !custId || !programId || !source) return;
    if (!targetProgCatId) {
      this.reassignError.set('Please select a destination assortment.');
      return;
    }
    this.savingReassign.set(true);
    this.reassignError.set(null);
    try {
      await this.service.reassignSkus(tpId, custId, programId, source.progCatId, targetProgCatId, source.productPk);
      this.closeReassignModal();
      await this.loadTree();
    } catch (err) {
      this.reassignError.set(err instanceof Error ? err.message : 'Failed to reassign items.');
    } finally {
      this.savingReassign.set(false);
    }
  }

  openReparentModal(category: CustomerProgramCategoryNode): void {
    this.reparentSourceTarget.set(category);
    this.reparentTargetProgCatId.set(null);
    this.reparentError.set(null);
    this.showReparentModal.set(true);
  }

  closeReparentModal(): void {
    this.showReparentModal.set(false);
    this.reparentSourceTarget.set(null);
  }

  async confirmReparent(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    const source = this.reparentSourceTarget();
    if (!tpId || !custId || !programId || !source) return;
    this.savingReparent.set(true);
    this.reparentError.set(null);
    try {
      await this.service.moveCategory(tpId, custId, programId, source.progCatId, this.reparentTargetProgCatId());
      this.closeReparentModal();
      await this.loadTree();
    } catch (err) {
      this.reparentError.set(err instanceof Error ? err.message : 'Failed to move assortment.');
    } finally {
      this.savingReparent.set(false);
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
      this.error.set(err instanceof Error ? err.message : 'Failed to delete assortment.');
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

  openDeleteGroupModal(group: ProductGroup): void {
    this.deleteGroupTarget.set(group);
    this.showDeleteGroupModal.set(true);
  }

  closeDeleteGroupModal(): void {
    this.showDeleteGroupModal.set(false);
    this.deleteGroupTarget.set(null);
  }

  async confirmDeleteGroup(): Promise<void> {
    const target = this.deleteGroupTarget();
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    if (!target || !tpId || !custId || !programId) return;
    this.deletingGroup.set(true);
    try {
      for (const sku of target.skus) {
        await this.service.removeSku(tpId, custId, programId, sku.progProdId);
      }
      this.closeDeleteGroupModal();
      await this.loadTree();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to remove product SKUs.');
      this.closeDeleteGroupModal();
      await this.loadTree();
    } finally {
      this.deletingGroup.set(false);
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

  protected readonly isDisplayableImageUrl = isDisplayableImageUrl;

  truncateTitle(text: string, max = 30): string {
    return text.length > max ? text.slice(0, max) + '…' : text;
  }
}
