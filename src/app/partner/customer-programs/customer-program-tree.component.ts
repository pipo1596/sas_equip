import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerProgramsService } from './customer-programs.service';
import {
  CustomerProgram, CustomerProgramCategoryNode, CustomerProgramProduct, CustomerProgramProductCandidate,
} from './customer-program.model';

interface TreeRow {
  kind: 'CATEGORY' | 'PRODUCT';
  level: number;
  key: string;
  category?: CustomerProgramCategoryNode;
  product?: CustomerProgramProduct;
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly program = signal<CustomerProgram | null>(null);
  readonly categories = signal<CustomerProgramCategoryNode[]>([]);
  readonly categoryCount = signal(0);
  readonly productCount = signal(0);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly search = signal('');
  readonly expandedIds = signal<Set<number>>(new Set());

  readonly showDeleteCategoryModal = signal(false);
  readonly deletingCategory = signal(false);
  readonly deleteCategoryTarget = signal<CustomerProgramCategoryNode | null>(null);

  readonly showAddProductModal = signal(false);
  readonly addProductTarget = signal<CustomerProgramCategoryNode | null>(null);
  readonly savingProduct = signal(false);
  readonly addProductError = signal<string | null>(null);
  readonly productSearch = signal('');
  readonly productSearchResults = signal<CustomerProgramProductCandidate[]>([]);
  readonly productSearching = signal(false);
  readonly selectedProductPks = signal<Set<number>>(new Set());

  readonly showDeleteProductModal = signal(false);
  readonly deletingProduct = signal(false);
  readonly deleteProductTarget = signal<CustomerProgramProduct | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private productSearchTimer: ReturnType<typeof setTimeout> | null = null;

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
    const expanded = this.expandedIds();
    const filtering = term.length > 0;
    const rows: TreeRow[] = [];

    const matches = (name: string) => name.toLowerCase().includes(term);

    const categoryMatches = (cat: CustomerProgramCategoryNode): boolean =>
      matches(cat.categoryName) ||
      cat.products.some(p => matches(p.productName)) ||
      cat.children.some(categoryMatches);

    const visit = (cat: CustomerProgramCategoryNode, level: number) => {
      if (filtering && !categoryMatches(cat)) return;
      rows.push({ kind: 'CATEGORY', level, key: 'c' + cat.progCatId, category: cat });
      const isOpen = filtering || expanded.has(cat.progCatId);
      if (!isOpen) return;
      for (const child of cat.children) visit(child, level + 1);
      for (const product of cat.products) {
        if (filtering && !matches(product.productName)) continue;
        rows.push({ kind: 'PRODUCT', level: level + 1, key: 'p' + product.progProdId, product });
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
      this.productCount.set(tree.productCount);
      this.expandAll();
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

  expandAll(): void {
    this.expandedIds.set(new Set(this.allCategoryIds()));
  }

  collapseAll(): void {
    this.expandedIds.set(new Set());
  }

  toggleExpand(progCatId: number): void {
    this.expandedIds.update(set => {
      const next = new Set(set);
      next.has(progCatId) ? next.delete(progCatId) : next.add(progCatId);
      return next;
    });
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

  countCategoryDescendants(category: CustomerProgramCategoryNode): { categories: number; products: number } {
    let categories = 0;
    let products = 0;
    const visit = (cat: CustomerProgramCategoryNode) => {
      categories++;
      products += cat.products.length;
      cat.children.forEach(visit);
    };
    visit(category);
    return { categories: categories - 1, products };
  }

  async openAddProductModal(category: CustomerProgramCategoryNode): Promise<void> {
    this.addProductTarget.set(category);
    this.selectedProductPks.set(new Set());
    this.productSearch.set('');
    this.addProductError.set(null);
    this.showAddProductModal.set(true);
    await this.runProductSearch('');
  }

  closeAddProductModal(): void {
    this.showAddProductModal.set(false);
    this.addProductTarget.set(null);
    this.productSearchResults.set([]);
  }

  onProductSearchChange(value: string): void {
    this.productSearch.set(value);
    if (this.productSearchTimer) clearTimeout(this.productSearchTimer);
    this.productSearchTimer = setTimeout(() => this.runProductSearch(value), 300);
  }

  private async runProductSearch(term: string): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    const target = this.addProductTarget();
    if (!tpId || !custId || !programId || !target) return;
    this.productSearching.set(true);
    try {
      this.productSearchResults.set(await this.service.searchProducts(tpId, custId, programId, target.progCatId, term));
    } catch {
      this.productSearchResults.set([]);
    } finally {
      this.productSearching.set(false);
    }
  }

  toggleProductSelected(productPk: number): void {
    this.selectedProductPks.update(set => {
      const next = new Set(set);
      next.has(productPk) ? next.delete(productPk) : next.add(productPk);
      return next;
    });
  }

  toggleSelectAllProducts(): void {
    const results = this.productSearchResults();
    const allSelected = results.length > 0 && results.every(p => this.selectedProductPks().has(p.productPk));
    this.selectedProductPks.set(allSelected ? new Set() : new Set(results.map(p => p.productPk)));
  }

  async saveAddProduct(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    const target = this.addProductTarget();
    const productPks = Array.from(this.selectedProductPks());
    if (!tpId || !custId || !programId || !target) return;
    if (productPks.length === 0) {
      this.addProductError.set('Please select at least one product.');
      return;
    }
    this.savingProduct.set(true);
    this.addProductError.set(null);
    try {
      await this.service.addProducts(tpId, custId, programId, target.progCatId, productPks);
      this.closeAddProductModal();
      await this.loadTree();
    } catch (err) {
      this.addProductError.set(err instanceof Error ? err.message : 'Failed to add products.');
    } finally {
      this.savingProduct.set(false);
    }
  }

  openDeleteProductModal(product: CustomerProgramProduct): void {
    this.deleteProductTarget.set(product);
    this.showDeleteProductModal.set(true);
  }

  closeDeleteProductModal(): void {
    this.showDeleteProductModal.set(false);
    this.deleteProductTarget.set(null);
  }

  async confirmDeleteProduct(): Promise<void> {
    const target = this.deleteProductTarget();
    const tpId = this.tpId;
    const custId = this.customerId;
    const programId = this.programId;
    if (!target || !tpId || !custId || !programId) return;
    this.deletingProduct.set(true);
    try {
      await this.service.removeProduct(tpId, custId, programId, target.progProdId);
      this.closeDeleteProductModal();
      await this.loadTree();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to remove product.');
      this.closeDeleteProductModal();
    } finally {
      this.deletingProduct.set(false);
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
}
