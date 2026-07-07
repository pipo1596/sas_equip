import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { CategoriesService } from './categories.service';
import { Category } from './category.model';

interface CategoryRow extends Category {
  level: number;
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './categories.component.html',
})
export class CategoriesComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(CategoriesService);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(50);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly expandedIds = signal<Set<number>>(new Set());

  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<Category | null>(null);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  readonly pageWindow = computed(() => {
    const tp = this.totalPages();
    const p = this.page();
    const start = Math.max(1, Math.min(p - 2, tp - 4));
    const end = Math.min(tp, Math.max(p + 2, 5));
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  readonly hasChildrenSet = computed(() => {
    const s = new Set<number>();
    for (const cat of this.categories()) {
      if (cat.parentCatId != null) s.add(cat.parentCatId);
    }
    return s;
  });

  readonly flatTree = computed(() =>
    this.search()
      ? this.buildFlatTree(this.categories(), null)
      : this.buildFlatTree(this.categories(), this.expandedIds())
  );

  ngOnInit(): void {
    this.loadCategories();
  }

  async loadCategories(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list(tpId, {
        page: this.page(),
        pageSize: this.pageSize(),
        search: this.search(),
      });
      this.categories.set(result.data);
      this.total.set(result.pagination.totalRows);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load categories.');
    } finally {
      this.loading.set(false);
    }
  }

  toggleExpand(catId: number): void {
    this.expandedIds.update(set => {
      const next = new Set(set);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  }

  buildFlatTree(cats: Category[], expandedIds: Set<number> | null): CategoryRow[] {
    const map = new Map<number, CategoryRow>(
      cats.map(c => [c.catId, { ...c, level: 0 }])
    );

    // Two-pass level assignment
    for (const cat of map.values()) {
      let node: CategoryRow | undefined = cat;
      let depth = 0;
      while (node?.parentCatId) {
        const parent = map.get(node.parentCatId);
        if (!parent || parent === node) break;
        depth++;
        node = parent;
        if (depth > 10) break; // guard
      }
      cat.level = 0; // reset
    }

    // Proper BFS level calculation
    for (const cat of map.values()) {
      if (!cat.parentCatId || !map.has(cat.parentCatId)) {
        cat.level = 0;
      }
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const cat of map.values()) {
        if (cat.parentCatId && map.has(cat.parentCatId)) {
          const parentLevel = map.get(cat.parentCatId)!.level;
          if (cat.level !== parentLevel + 1) {
            cat.level = parentLevel + 1;
            changed = true;
          }
        }
      }
    }

    const result: CategoryRow[] = [];
    const visited = new Set<number>();

    const visit = (catId: number) => {
      if (visited.has(catId)) return;
      const node = map.get(catId);
      if (!node) return;
      visited.add(catId);
      result.push(node);
      if (!expandedIds || expandedIds.has(catId)) {
        for (const child of map.values()) {
          if (child.parentCatId === catId) visit(child.catId);
        }
      }
    };

    for (const cat of map.values()) {
      if (!cat.parentCatId || !map.has(cat.parentCatId)) {
        visit(cat.catId);
      }
    }
    // Show true orphans: parent exists in DB but is on a different page
    for (const cat of map.values()) {
      if (!visited.has(cat.catId) && cat.parentCatId != null && !map.has(cat.parentCatId)) {
        result.push(cat);
      }
    }
    return result;
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.loadCategories(); }, 350);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadCategories();
  }

  editCategory(cat: Category): void {
    this.router.navigate(['/partner', this.tpId, 'products', 'categories', cat.catId, 'edit'], {
      state: { category: cat },
    });
  }

  openDeleteModal(cat: Category): void {
    this.deleteTarget.set(cat);
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
      await this.service.remove(tpId, target.catId);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      await this.loadCategories();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Delete failed.');
      this.closeDeleteModal();
    } finally {
      this.deleting.set(false);
    }
  }

  statusBadge(flag: string): string {
    return flag === 'Y'
      ? 'badge bg-success-subtle text-success border border-success-subtle'
      : 'badge bg-secondary-subtle text-secondary border border-secondary-subtle';
  }
}
