import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformAdminsService } from './platform-admins.service';
import { PlatformAdmin } from './platform-admin.model';

@Component({
  selector: 'app-platform-admins',
  templateUrl: './platform-admins.component.html',
  standalone: false,
})
export class PlatformAdminsComponent implements OnInit {
  private readonly service = inject(PlatformAdminsService);
  private readonly router = inject(Router);

  readonly admins = signal<PlatformAdmin[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Delete modal state
  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<PlatformAdmin | null>(null);

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

  ngOnInit(): void {
    this.loadAdmins();
  }

  async loadAdmins(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list({
        page: this.page(),
        pageSize: this.pageSize(),
        search: this.search(),
      });
      this.admins.set(result.data);
      this.total.set(result.pagination.totalRows);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load platform admins.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.loadAdmins();
    }, 350);
  }

  onPageSizeChange(value: string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
    this.loadAdmins();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadAdmins();
  }

  editAdmin(admin: PlatformAdmin): void {
    this.router.navigate(['/admin/platform-admins', admin.padminId, 'edit'], {
      state: { admin },
    });
  }

  openDeleteModal(admin: PlatformAdmin): void {
    this.deleteTarget.set(admin);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleting.set(true);
    try {
      await this.service.remove(target.padminId);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      if (this.admins().length === 1 && this.page() > 1) {
        this.page.update(p => p - 1);
      }
      await this.loadAdmins();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Delete failed. Please try again.');
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
    } finally {
      this.deleting.set(false);
    }
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'badge bg-success';
      case 'LOCKED': return 'badge bg-warning text-dark';
      case 'DISABLED': return 'badge bg-secondary';
      default: return 'badge bg-light text-dark';
    }
  }

  displayName(admin: PlatformAdmin): string {
    const parts = [admin.firstName, admin.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
  }

  formatDate(ts: string | null): string {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  }
}
