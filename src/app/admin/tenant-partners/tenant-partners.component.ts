import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { TenantPartnersService } from './tenant-partners.service';
import { TenantPartner } from './tenant-partner.model';

@Component({
  selector: 'app-tenant-partners',
  templateUrl: './tenant-partners.component.html',
  standalone: false,
})
export class TenantPartnersComponent implements OnInit {
  private readonly service = inject(TenantPartnersService);
  private readonly router = inject(Router);

  readonly partners = signal<TenantPartner[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<TenantPartner | null>(null);

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
    this.loadPartners();
  }

  async loadPartners(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list({
        page: this.page(),
        pageSize: this.pageSize(),
        search: this.search(),
      });
      this.partners.set(result.data);
      this.total.set(result.pagination.totalRows);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load tenant partners.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.loadPartners();
    }, 350);
  }

  onPageSizeChange(value: string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
    this.loadPartners();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadPartners();
  }

  editPartner(partner: TenantPartner): void {
    this.router.navigate(['/admin/tenant-partners', partner.tpId, 'edit'], {
      state: { partner },
    });
  }

  openDeleteModal(partner: TenantPartner): void {
    this.deleteTarget.set(partner);
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
      await this.service.remove(target.tpId);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      if (this.partners().length === 1 && this.page() > 1) {
        this.page.update(p => p - 1);
      }
      await this.loadPartners();
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
      case 'INACTIVE': return 'badge bg-secondary';
      case 'SUSPENDED': return 'badge bg-warning text-dark';
      default: return 'badge bg-light text-dark';
    }
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
