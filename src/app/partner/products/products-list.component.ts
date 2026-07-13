import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgStyle, TitleCasePipe } from '@angular/common';
import { PartnerModeService } from '../partner-mode.service';
import { ProductsService } from './products.service';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import { Product, ProductSummary } from './product.model';
import { Brand } from '../brands/brand.model';
import { Category } from '../categories/category.model';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [FormsModule, RouterModule, DecimalPipe, NgStyle, TitleCasePipe],
  templateUrl: './products-list.component.html',
})
export class ProductsListComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(ProductsService);
  private readonly brandsService = inject(BrandsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly router = inject(Router);

  readonly products = signal<Product[]>([]);
  readonly summary = signal<ProductSummary | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(50);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly filterStatus = signal('');
  readonly filterBrandId = signal<number | null>(null);
  readonly filterCatId = signal<number | null>(null);
  readonly filterPlatform = signal('');

  readonly brands = signal<Brand[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly platforms = signal<string[]>([]);

  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<Product | null>(null);

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

  readonly hasActiveFilters = computed(() =>
    !!this.filterStatus() || !!this.filterBrandId() || !!this.filterCatId() || !!this.filterPlatform()
  );

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  async ngOnInit(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    await this.loadProducts();
    try { this.brands.set(await this.brandsService.listAll(tpId)); } catch {}
    try { this.categories.set(await this.categoriesService.listAll(tpId)); } catch {}
    try { this.platforms.set(await this.service.listPlatforms(tpId)); } catch {}
  }

  async loadProducts(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list(tpId, {
        page: this.page(),
        pageSize: this.pageSize(),
        search: this.search(),
        status: this.filterStatus() || undefined,
        brandId: this.filterBrandId() ?? undefined,
        catId: this.filterCatId() ?? undefined,
        platformCd: this.filterPlatform() || undefined,
      });
      this.products.set(result.data);
      this.total.set(result.pagination.totalRows);
      if (result.summary) this.summary.set(result.summary);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load products.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.loadProducts();
    }, 350);
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadProducts();
  }

  clearFilters(): void {
    this.search.set('');
    this.filterStatus.set('');
    this.filterBrandId.set(null);
    this.filterCatId.set(null);
    this.filterPlatform.set('');
    this.page.set(1);
    this.loadProducts();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadProducts();
  }

  openProduct(product: Product): void {
    this.router.navigate(['/partner', this.tpId, 'products', product.productPk], {
      state: { product },
    });
  }

  openDeleteModal(product: Product): void {
    this.deleteTarget.set(product);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    const tpId = this.tpId;
    if (!target || !tpId) return;
    this.deleting.set(true);
    try {
      await this.service.remove(tpId, target.productPk);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      if (this.products().length === 1 && this.page() > 1) {
        this.page.update(p => p - 1);
      }
      await this.loadProducts();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Delete failed. Please try again.');
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
    } finally {
      this.deleting.set(false);
    }
  }

  private readonly abbrPalette = [
    { bg: '#dbeafe', color: '#1e40af' },
    { bg: '#ede9fe', color: '#5b21b6' },
    { bg: '#fef3c7', color: '#92400e' },
    { bg: '#dcfce7', color: '#166534' },
    { bg: '#fce7f3', color: '#9d174d' },
    { bg: '#e0f2fe', color: '#0369a1' },
    { bg: '#ffedd5', color: '#9a3412' },
    { bg: '#f1f5f9', color: '#334155' },
  ];

  catBreadcrumb(cat: Category): string {
    const map = new Map(this.categories().map(c => [c.catId, c]));
    const parts: string[] = [];
    let current: Category | undefined = cat;
    while (current) {
      parts.unshift(current.catName);
      current = current.parentCatId ? map.get(current.parentCatId) : undefined;
    }
    return parts.join(' › ');
  }

  primaryCatBreadcrumb(categoryName: string | null | undefined): string {
    if (!categoryName) return '—';
    const cat = this.categories().find(c => c.catName === categoryName);
    return cat ? this.catBreadcrumb(cat) : categoryName;
  }

  sortedCatsByBreadcrumb(): Array<{ cat: Category; breadcrumb: string }> {
    return this.categories()
      .map(c => ({ cat: c, breadcrumb: this.catBreadcrumb(c) }))
      .sort((a, b) => a.breadcrumb.localeCompare(b.breadcrumb));
  }

  productAbbr(title: string): string {
    const words = title.trim().split(/\s+/);
    if (words.length >= 3) return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
    if (words.length === 2) return (words[0].substring(0, 2) + words[1][0]).toUpperCase();
    return title.substring(0, 3).toUpperCase();
  }

  abbrStyle(productPk: number): Record<string, string> {
    const c = this.abbrPalette[productPk % this.abbrPalette.length];
    return { background: c.bg, color: c.color };
  }

  statusDotClass(status: string): string {
    switch (status) {
      case 'ACTIVE':   return 'product-status-pill product-status-pill--active';
      case 'DRAFT':    return 'product-status-pill product-status-pill--draft';
      case 'ARCHIVED': return 'product-status-pill product-status-pill--archived';
      default:         return 'product-status-pill';
    }
  }

  stockClass(status: string | null | undefined): string {
    switch (status) {
      case 'IN_STOCK':     return 'text-success fw-semibold';
      case 'LOW_STOCK':    return 'text-warning fw-semibold';
      case 'OUT_OF_STOCK': return 'text-danger fw-semibold';
      default:             return 'text-muted';
    }
  }

  stockLabel(status: string | null | undefined): string {
    switch (status) {
      case 'IN_STOCK':     return 'In Stock';
      case 'LOW_STOCK':    return 'Low Stock';
      case 'OUT_OF_STOCK': return 'Out of Stock';
      default:             return '—';
    }
  }
}
