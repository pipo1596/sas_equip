import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerRolesService } from './customer-roles.service';
import { CustomerRole } from './customer-role.model';

@Component({
  selector: 'app-customer-roles',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './customer-roles.component.html',
})
export class CustomerRolesComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerRolesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly roles = signal<CustomerRole[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<CustomerRole | null>(null);

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

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  protected get customerId(): number | null {
    const idParam = this.route.snapshot.paramMap.get('customerId');
    return idParam ? Number(idParam) : null;
  }

  async ngOnInit(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (tpId && custId) await this.customerMode.ensure(tpId, custId);
    this.loadRoles();
  }

  async loadRoles(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list(tpId, custId, {
        page: this.page(),
        pageSize: this.pageSize(),
        search: this.search(),
      });
      this.roles.set(result.data);
      this.total.set(result.pagination.totalRows);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load roles.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.loadRoles(); }, 350);
  }

  onPageSizeChange(value: string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
    this.loadRoles();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadRoles();
  }

  newRole(): void {
    this.router.navigate(['/partner', this.tpId, 'customers', this.customerId, 'roles', 'new']);
  }

  editRole(role: CustomerRole): void {
    this.router.navigate(
      ['/partner', this.tpId, 'customers', this.customerId, 'roles', role.roleId, 'edit'],
      { state: { role } },
    );
  }

  openDeleteModal(role: CustomerRole): void {
    this.deleteTarget.set(role);
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
    if (!target || !tpId || !custId) return;
    this.deleting.set(true);
    try {
      await this.service.remove(tpId, custId, target.roleId);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      if (this.roles().length === 1 && this.page() > 1) this.page.update(p => p - 1);
      await this.loadRoles();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Delete failed.');
      this.closeDeleteModal();
    } finally {
      this.deleting.set(false);
    }
  }

  accessLevelBadge(level: string): string {
    switch (level) {
      case 'ADMIN': return 'badge border border-primary-subtle text-primary bg-primary-subtle';
      case 'APPROVER': return 'badge border border-info-subtle text-info bg-info-subtle';
      default: return 'badge border bg-light text-dark';
    }
  }

  allotmentLabel(type: string): string {
    switch (type) {
      case 'DOLLAR': return 'Dollar';
      case 'POINT': return 'Point';
      case 'ITEM': return 'Item';
      case 'COMBO': return 'Combo';
      default: return 'None';
    }
  }

  statusBadge(active: string): string {
    return active === 'Y'
      ? 'badge bg-success-subtle text-success border border-success-subtle'
      : 'badge bg-secondary-subtle text-secondary border border-secondary-subtle';
  }
}
