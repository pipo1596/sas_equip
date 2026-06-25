import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { PartnerUsersService } from './partner-users.service';
import { PartnerUser } from './partner-user.model';

@Component({
  selector: 'app-partner-users',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './partner-users.component.html',
})
export class PartnerUsersComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(PartnerUsersService);
  private readonly router = inject(Router);

  readonly users = signal<PartnerUser[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<PartnerUser | null>(null);

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

  private get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
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
      this.users.set(result.data);
      this.total.set(result.pagination.totalRows);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.loadUsers();
    }, 350);
  }

  onPageSizeChange(value: string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
    this.loadUsers();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadUsers();
  }

  editUser(user: PartnerUser): void {
    this.router.navigate(
      ['/partner', this.tpId, 'settings', 'users', user.userId, 'edit'],
      { state: { user } },
    );
  }

  openDeleteModal(user: PartnerUser): void {
    this.deleteTarget.set(user);
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
      await this.service.remove(tpId, target.userId);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      if (this.users().length === 1 && this.page() > 1) {
        this.page.update(p => p - 1);
      }
      await this.loadUsers();
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
      case 'ACTIVE': return 'badge bg-success-subtle text-success border border-success-subtle';
      case 'LOCKED': return 'badge bg-warning-subtle text-warning border border-warning-subtle';
      case 'DISABLED': return 'badge bg-secondary-subtle text-secondary border border-secondary-subtle';
      default: return 'badge bg-light text-dark';
    }
  }

  displayName(user: PartnerUser): string {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
  }

  initials(user: PartnerUser): string {
    const f = user.firstName?.[0] ?? '';
    const l = user.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || '?';
  }

  private readonly avatarColors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#64748b',
  ];

  avatarColor(user: PartnerUser): string {
    const hash = (user.userId ?? 0) % this.avatarColors.length;
    return this.avatarColors[hash];
  }

  username(user: PartnerUser): string {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length ? '@' + parts.join('.').toLowerCase() : '';
  }

  roleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'badge border border-primary-subtle text-primary bg-primary-subtle';
      default: return 'badge border bg-light text-dark';
    }
  }

  roleLabel(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Administrator';
      default: return role;
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
