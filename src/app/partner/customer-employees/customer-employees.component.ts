import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerEmployeesService } from './customer-employees.service';
import { CustomerEmployee } from './customer-employee.model';
import { DataResidencyRegion } from '../../shared/data-residency.service';

@Component({
  selector: 'app-customer-employees',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './customer-employees.component.html',
})
export class CustomerEmployeesComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerEmployeesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly employees = signal<CustomerEmployee[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<CustomerEmployee | null>(null);

  readonly region = signal<DataResidencyRegion | null>(null);

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
    if (tpId) this.region.set(await this.service.regionFor(tpId));
    this.loadEmployees();
  }

  async loadEmployees(): Promise<void> {
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
      this.employees.set(result.data);
      this.total.set(result.pagination.totalRows);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load employees.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.loadEmployees(); }, 350);
  }

  onPageSizeChange(value: string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
    this.loadEmployees();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadEmployees();
  }

  editEmployee(employee: CustomerEmployee): void {
    this.router.navigate(
      ['/partner', this.tpId, 'customers', this.customerId, 'employees', employee.empId, 'edit'],
      { state: { employee } },
    );
  }

  openDeleteModal(employee: CustomerEmployee): void {
    this.deleteTarget.set(employee);
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
      await this.service.remove(tpId, custId, target.empId);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      if (this.employees().length === 1 && this.page() > 1) this.page.update(p => p - 1);
      await this.loadEmployees();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Delete failed.');
      this.closeDeleteModal();
    } finally {
      this.deleting.set(false);
    }
  }

  displayName(employee: CustomerEmployee): string {
    const parts = [employee.firstName, employee.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : '—';
  }

  initials(employee: CustomerEmployee): string {
    const f = employee.firstName?.[0] ?? '';
    const l = employee.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || '?';
  }

  private readonly avatarColors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#64748b',
  ];

  avatarColor(employee: CustomerEmployee): string {
    const hash = (employee.empId ?? 0) % this.avatarColors.length;
    return this.avatarColors[hash];
  }

  regionLabel(): string {
    return this.region() === 'CA' ? 'Canada' : 'United States';
  }

  regionCountryShort(): string {
    return this.region() === 'CA' ? 'Canada' : 'USA';
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'badge bg-success-subtle text-success border border-success-subtle';
      case 'ON-LEAVE': return 'badge bg-warning-subtle text-warning border border-warning-subtle';
      case 'TERMINATED': return 'badge bg-danger-subtle text-danger border border-danger-subtle';
      case 'INACTIVE': return 'badge bg-secondary-subtle text-secondary border border-secondary-subtle';
      default: return 'badge bg-light text-dark';
    }
  }
}
