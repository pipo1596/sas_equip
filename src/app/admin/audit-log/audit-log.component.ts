import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { AuditLogService } from './audit-log.service';
import { AuditLogEntry } from './audit-log.model';

interface DiffRow {
  key: string;
  before: string | null;
  after: string | null;
  state: 'changed' | 'added' | 'removed' | 'unchanged';
}

@Component({
  selector: 'app-audit-log',
  templateUrl: './audit-log.component.html',
  standalone: false,
})
export class AuditLogComponent implements OnInit {
  private readonly service = inject(AuditLogService);

  readonly entries = signal<AuditLogEntry[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Filters
  readonly filterEntityType = signal('');
  readonly filterDateFrom = signal('');
  readonly filterDateTo = signal('');
  readonly filterSearch = signal('');

  // Detail modal
  readonly detailEntry = signal<AuditLogEntry | null>(null);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize()))
  );

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

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list({
        entityType: this.filterEntityType(),
        dateFrom: this.filterDateFrom(),
        dateTo: this.filterDateTo(),
        search: this.filterSearch(),
        page: this.page(),
        pageSize: this.pageSize(),
      });
      this.entries.set(result.data);
      this.total.set(result.pagination.totalRows);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load audit log.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.filterSearch.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 350);
  }

  onFilterChange(): void {
    this.page.set(1);
    this.load();
  }

  onPageSizeChange(value: string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.load();
  }

  clearFilters(): void {
    this.filterEntityType.set('');
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
    this.filterSearch.set('');
    this.page.set(1);
    this.load();
  }

  openDetail(entry: AuditLogEntry): void {
    this.detailEntry.set(entry);
  }

  closeDetail(): void {
    this.detailEntry.set(null);
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filterEntityType() ||
      this.filterDateFrom() ||
      this.filterDateTo() ||
      this.filterSearch()
    );
  }

  actionBadgeClass(action: string): string {
    switch (action) {
      case 'CREATE': return 'badge bg-success';
      case 'UPDATE': return 'badge bg-primary';
      case 'DELETE': return 'badge bg-danger';
      case 'LOGIN':  return 'badge bg-info text-dark';
      case 'LOGOUT': return 'badge bg-secondary';
      default:       return 'badge bg-light text-dark border';
    }
  }

  formatTs(ts: string | null): string {
    if (!ts) return '—';
    return ts;
  }

  actorDisplay(entry: AuditLogEntry): string {
    if (entry.actorPadminId) return `Admin #${entry.actorPadminId}`;
    if (entry.actorEpuId)    return `EPU #${entry.actorEpuId}`;
    if (entry.actorEmpId)    return `Emp #${entry.actorEmpId}`;
    return entry.actorType || '—';
  }

  truncate(value: string | null, max = 60): string {
    if (!value) return '—';
    return value.length > max ? value.slice(0, max) + '…' : value;
  }

  formatJson(value: string | null): string {
    if (!value) return '—';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  diffValues(before: string | null, after: string | null): DiffRow[] | null {
    try {
      const b = before ? JSON.parse(before) : null;
      const a = after  ? JSON.parse(after)  : null;
      if (typeof b !== 'object' && typeof a !== 'object') return null;
      const keys = new Set([
        ...Object.keys(b ?? {}),
        ...Object.keys(a ?? {}),
      ]);
      const rows: DiffRow[] = Array.from(keys).map(key => {
        const bVal = (b && key in b) ? String(b[key] ?? '') : null;
        const aVal = (a && key in a) ? String(a[key] ?? '') : null;
        let state: DiffRow['state'];
        if (bVal === null)       state = 'added';
        else if (aVal === null)  state = 'removed';
        else if (bVal !== aVal)  state = 'changed';
        else                     state = 'unchanged';
        return { key, before: bVal, after: aVal, state };
      });
      // Changed/added/removed rows first, then unchanged
      rows.sort((x, y) => {
        const rank = (s: DiffRow['state']) =>
          s === 'unchanged' ? 1 : 0;
        return rank(x.state) - rank(y.state);
      });
      return rows;
    } catch {
      return null;
    }
  }
}
