import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerRolesService } from './customer-roles.service';
import { CustomerRole, CustomerRoleForm } from './customer-role.model';
import { CustomerAllotmentRulesService } from '../customer-allotment-rules/customer-allotment-rules.service';
import { CustomerAllotmentRuleForm } from '../customer-allotment-rules/customer-allotment-rule.model';

interface RoleForm {
  roleName: string;
  accessLevel: 'EMPLOYEE' | 'APPROVER' | 'ADMIN';
  allotmentType: 'NONE' | 'DOLLAR' | 'POINT' | 'ITEM' | 'COMBO';
  description: string;
  isActive: 'Y' | 'N';
  canOrderSelf: 'Y' | 'N';
  canApprove: 'Y' | 'N';
  canShopForOthers: 'Y' | 'N';
  canManageTeamBalances: 'Y' | 'N';
  // Local-only: seeds the auto-created default Allotment Rule when
  // allotmentType !== 'NONE'. Not part of CustomerRoleForm/APITPCROLE.
  quickAmount: number | null;
}

const BLANK_FORM: RoleForm = {
  roleName: '', accessLevel: 'EMPLOYEE', allotmentType: 'NONE', description: '', isActive: 'Y',
  canOrderSelf: 'Y', canApprove: 'N', canShopForOthers: 'N', canManageTeamBalances: 'N',
  quickAmount: null,
};

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
  private readonly rulesService = inject(CustomerAllotmentRulesService);
  private readonly route = inject(ActivatedRoute);

  readonly roles = signal<CustomerRole[]>([]);
  readonly roleEmployeeCounts = signal<Record<number, number>>({});
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly showFormModal = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly saveWarning = signal<string | null>(null);

  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<CustomerRole | null>(null);

  form: RoleForm = { ...BLANK_FORM };

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
    this.loadRoleEmployeeCounts();
  }

  async loadRoleEmployeeCounts(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    try {
      this.roleEmployeeCounts.set(await this.service.getRoleEmployeeCounts(tpId, custId));
    } catch {
      // Non-critical — the column just falls back to 0 for every role.
    }
  }

  employeeCountFor(roleId: number): number {
    return this.roleEmployeeCounts()[roleId] ?? 0;
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

  openAddModal(): void {
    this.editingId.set(null);
    this.form = { ...BLANK_FORM };
    this.saveError.set(null);
    this.submitted.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(role: CustomerRole): void {
    this.editingId.set(role.roleId);
    this.form = {
      roleName:      role.roleName,
      accessLevel:   role.accessLevel,
      allotmentType: role.allotmentType,
      description:   role.description ?? '',
      isActive:      role.isActive,
      // Carried through even though this modal doesn't show them — a save
      // here must not blank out permissions set on the role detail page.
      canOrderSelf:          role.canOrderSelf,
      canApprove:            role.canApprove,
      canShopForOthers:      role.canShopForOthers,
      canManageTeamBalances: role.canManageTeamBalances,
      quickAmount: null,
    };
    this.saveError.set(null);
    this.submitted.set(false);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  async saveRole(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    this.submitted.set(true);
    if (!this.form.roleName) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.saveWarning.set(null);
    try {
      const { quickAmount, ...rolePayload } = this.form;
      const payload: CustomerRoleForm = { ...rolePayload };
      const id = this.editingId();
      if (id === null) {
        const created = await this.service.create(tpId, custId, payload);
        if (payload.allotmentType !== 'NONE') {
          await this.createDefaultRule(tpId, custId, created.roleId, payload.allotmentType, quickAmount);
        }
      } else {
        await this.service.update(tpId, custId, id, payload);
      }
      this.showFormModal.set(false);
      await this.loadRoles();
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save role.');
    } finally {
      this.saving.set(false);
    }
  }

  // Quick-add convenience: when a new role is created with an allotment
  // type other than NONE, seed one default Allotment Rule so the role
  // isn't left with an allotment type but zero rules. Left as DRAFT since
  // UNITS/DOLLAR_UNITS rules are created with an empty scope (unit
  // quantities need a concrete assortment — see the rule editor's own
  // scope-vs-unit-type rule) and are functionally incomplete until edited.
  private async createDefaultRule(
    tpId: number, custId: number, roleId: number,
    allotmentType: 'DOLLAR' | 'POINT' | 'ITEM' | 'COMBO', amount: number | null,
  ): Promise<void> {
    const allotType = { DOLLAR: 'DOLLAR', ITEM: 'UNITS', COMBO: 'DOLLAR_UNITS', POINT: 'POINTS' }[allotmentType] as
      'DOLLAR' | 'UNITS' | 'DOLLAR_UNITS' | 'POINTS';
    const needsScope = allotType === 'UNITS' || allotType === 'DOLLAR_UNITS';
    const form: CustomerAllotmentRuleForm = {
      ruleName: 'Default',
      status: 'DRAFT',
      allotType,
      dollarAmount: (allotType === 'DOLLAR' || allotType === 'DOLLAR_UNITS') ? amount : null,
      pointsAmount: allotType === 'POINTS' ? amount : null,
      scopeAllAssortments: needsScope ? 'N' : 'Y',
      renewalBasis: 'FIXED',
      renewalPeriodMonths: 12,
      renewalTime: '00:00:00',
      hireDaysOffset: null,
      cycleStartDate: new Date().toISOString().slice(0, 10),
      expirationDate: null,
      onExpirationAction: 'AUTO_RENEW',
      carryoverType: 'FORFEIT',
      carryoverPct: null,
      autoCreateNewEmp: 'Y',
      prorateMidCycle: 'Y',
      notifyNewCycle: 'N',
      notifyLowBalance: 'N',
      notifyCarryover: 'N',
      requireApproval: 'N',
      allowCcFallback: 'Y',
    };
    try {
      await this.rulesService.create(tpId, custId, roleId, form);
    } catch {
      this.saveWarning.set('Role created, but its default allotment rule could not be created — add one from the role’s Allotment Rules tab.');
    }
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
      case 'POINT': return 'Points';
      case 'ITEM': return 'Units';
      case 'COMBO': return 'Dollar + Units';
      default: return 'None';
    }
  }

  statusBadge(active: string): string {
    return active === 'Y'
      ? 'badge bg-success-subtle text-success border border-success-subtle'
      : 'badge bg-secondary-subtle text-secondary border border-secondary-subtle';
  }
}
