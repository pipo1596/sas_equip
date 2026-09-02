import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerRolesService } from '../customer-roles/customer-roles.service';
import { CustomerRole } from '../customer-roles/customer-role.model';
import { CustomerProgramsService } from '../customer-programs/customer-programs.service';
import { CustomerProgram, CustomerProgramCategoryNode } from '../customer-programs/customer-program.model';
import { CustomerPaymentLedgersService } from '../customer-payment-ledgers/customer-payment-ledgers.service';
import { CustomerPaymentLedger } from '../customer-payment-ledgers/customer-payment-ledger.model';
import { CustomerAllotmentRulesService } from './customer-allotment-rules.service';
import {
  CustomerAllotmentRule, CustomerAllotmentRuleForm, RuleQuotaLimit, RuleQuotaLimitForm,
} from './customer-allotment-rule.model';

const BLANK_FORM: CustomerAllotmentRuleForm = {
  ruleName: '', status: 'DRAFT', allotType: 'DOLLAR', dollarAmount: null, pointsAmount: null,
  scopeAllAssortments: 'Y', renewalBasis: 'FIXED', renewalPeriodMonths: 12, renewalTime: '00:00:00',
  hireDaysOffset: null, cycleStartDate: new Date().toISOString().slice(0, 10), expirationDate: null,
  onExpirationAction: 'SUSPEND', carryoverType: 'FORFEIT', carryoverPct: null,
  autoCreateNewEmp: 'Y', prorateMidCycle: 'Y', notifyNewCycle: 'Y', notifyLowBalance: 'Y', notifyCarryover: 'N',
  requireApproval: 'N', allowCcFallback: 'Y',
};

const BLANK_QUOTA_FORM: RuleQuotaLimitForm = { programId: 0, progCatId: null, limitType: 'UNITS', limitValue: 0 };

@Component({
  selector: 'app-customer-allotment-rule-editor',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './customer-allotment-rule-editor.component.html',
})
export class CustomerAllotmentRuleEditorComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly rolesService = inject(CustomerRolesService);
  private readonly programsService = inject(CustomerProgramsService);
  private readonly ledgersService = inject(CustomerPaymentLedgersService);
  private readonly service = inject(CustomerAllotmentRulesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly role = signal<CustomerRole | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly allPrograms = signal<CustomerProgram[]>([]);
  readonly allLedgers = signal<CustomerPaymentLedger[]>([]);

  form: CustomerAllotmentRuleForm = { ...BLANK_FORM };

  // ── Scope (assortments covered) ─────────────────────────────────────────
  readonly scopeProgramIds = signal<Set<number>>(new Set());
  readonly unitQtyByProgram = signal<Record<number, number>>({});
  readonly showScopeModal = signal(false);
  readonly scopeModalSearch = signal('');
  readonly scopeModalSelected = signal<Set<number>>(new Set());

  // ── Quota limits ─────────────────────────────────────────────────────────
  readonly quotas = signal<RuleQuotaLimit[]>([]);
  readonly showQuotaModal = signal(false);
  readonly editingQuotaId = signal<number | null>(null);
  readonly quotaSaving = signal(false);
  readonly quotaError = signal<string | null>(null);
  readonly quotaCategories = signal<{ progCatId: number | null; label: string }[]>([]);
  quotaForm: RuleQuotaLimitForm = { ...BLANK_QUOTA_FORM };
  readonly showDeleteQuotaModal = signal(false);
  readonly deleteQuotaTarget = signal<RuleQuotaLimit | null>(null);
  readonly deletingQuota = signal(false);

  // ── Payment ledger precedence chain ─────────────────────────────────────
  readonly slots = signal<(number | null)[]>([null, null, null]);

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  protected get customerId(): number | null {
    const p = this.route.snapshot.paramMap.get('customerId');
    return p ? Number(p) : null;
  }

  protected get roleId(): number | null {
    const p = this.route.snapshot.paramMap.get('roleId');
    return p ? Number(p) : null;
  }

  protected get ruleId(): number | null {
    const p = this.route.snapshot.paramMap.get('ruleId');
    return p ? Number(p) : null;
  }

  get isEdit(): boolean {
    return this.ruleId !== null;
  }

  get needsUnitScope(): boolean {
    return this.form.allotType === 'UNITS' || this.form.allotType === 'DOLLAR_UNITS';
  }

  get allowsPartialCarryover(): boolean {
    return this.form.dollarAmount != null;
  }

  get carryoverCapPreview(): number | null {
    if (this.form.carryoverType !== 'PARTIAL' || this.form.carryoverPct == null || this.form.dollarAmount == null) return null;
    return this.form.dollarAmount * this.form.carryoverPct / 100;
  }

  get scopedPrograms(): CustomerProgram[] {
    const ids = this.scopeProgramIds();
    return this.allPrograms().filter(p => ids.has(p.programId));
  }

  async ngOnInit(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const roleId = this.roleId;
    if (tpId && custId) await this.customerMode.ensure(tpId, custId);

    await Promise.all([this.loadPrograms(), this.loadLedgers()]);
    if (roleId != null) await this.loadRole(roleId);

    const ruleId = this.ruleId;
    if (ruleId !== null) {
      const state = window.history.state as { rule?: CustomerAllotmentRule };
      if (state.rule && state.rule.ruleId === ruleId) {
        this.applyRule(state.rule);
      } else {
        await this.fetchRule(ruleId);
      }
      await Promise.all([this.loadScope(ruleId), this.loadQuotas(ruleId), this.loadLedgerChain(ruleId)]);
    } else {
      this.form = { ...BLANK_FORM };
    }
  }

  private async loadRole(roleId: number): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    try {
      this.role.set(await this.rolesService.get(tpId, custId, roleId));
    } catch {
      // Non-critical for the editor itself — only affects the header/back link label.
    }
  }

  private async loadPrograms(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    try {
      this.allPrograms.set(await this.programsService.listAll(tpId, custId));
    } catch {
      // Non-critical at load time — scope/quota pickers will just show empty lists.
    }
  }

  private async loadLedgers(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    try {
      this.allLedgers.set(await this.ledgersService.listAll(tpId, custId));
    } catch {
      // Non-critical at load time.
    }
  }

  private async fetchRule(ruleId: number): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const roleId = this.roleId;
    if (!tpId || !custId || roleId == null) return;
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.applyRule(await this.service.get(tpId, custId, roleId, ruleId));
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load rule.');
    } finally {
      this.loading.set(false);
    }
  }

  private applyRule(rule: CustomerAllotmentRule): void {
    this.form = {
      ruleName: rule.ruleName,
      status: rule.status,
      allotType: rule.allotType,
      dollarAmount: rule.dollarAmount,
      pointsAmount: rule.pointsAmount,
      scopeAllAssortments: rule.scopeAllAssortments,
      renewalBasis: rule.renewalBasis,
      renewalPeriodMonths: rule.renewalPeriodMonths,
      renewalTime: rule.renewalTime,
      hireDaysOffset: rule.hireDaysOffset,
      cycleStartDate: rule.cycleStartDate,
      expirationDate: rule.expirationDate,
      onExpirationAction: rule.onExpirationAction,
      carryoverType: rule.carryoverType,
      carryoverPct: rule.carryoverPct,
      autoCreateNewEmp: rule.autoCreateNewEmp,
      prorateMidCycle: rule.prorateMidCycle,
      notifyNewCycle: rule.notifyNewCycle,
      notifyLowBalance: rule.notifyLowBalance,
      notifyCarryover: rule.notifyCarryover,
      requireApproval: rule.requireApproval,
      allowCcFallback: rule.allowCcFallback,
    };
  }

  private async loadScope(ruleId: number): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const roleId = this.roleId;
    if (!tpId || !custId || roleId == null) return;
    try {
      const scope = await this.service.getScope(tpId, custId, roleId, ruleId);
      this.scopeProgramIds.set(new Set(scope.map(s => s.programId)));
      const qtyMap: Record<number, number> = {};
      scope.forEach(s => { if (s.unitQty != null) qtyMap[s.programId] = s.unitQty; });
      this.unitQtyByProgram.set(qtyMap);
    } catch {
      // Leave scope empty — editable from scratch.
    }
  }

  // ── Type & amount ────────────────────────────────────────────────────────

  onAllotTypeChange(): void {
    if (this.needsUnitScope) this.form.scopeAllAssortments = 'N';
    if (!this.allowsPartialCarryover && this.form.carryoverType === 'PARTIAL') {
      this.form.carryoverType = 'FORFEIT';
      this.form.carryoverPct = null;
    }
  }

  onDollarAmountChange(): void {
    if (!this.allowsPartialCarryover && this.form.carryoverType === 'PARTIAL') {
      this.form.carryoverType = 'FORFEIT';
      this.form.carryoverPct = null;
    }
  }

  // ── Renewal basis ────────────────────────────────────────────────────────

  onRenewalBasisChange(): void {
    if (this.form.renewalBasis !== 'HIREDAYS') this.form.hireDaysOffset = null;
    if (this.form.renewalBasis !== 'FIXED') this.form.cycleStartDate = null;
    else if (!this.form.cycleStartDate) this.form.cycleStartDate = new Date().toISOString().slice(0, 10);
  }

  // ── Scope chip picker ────────────────────────────────────────────────────

  removeFromScope(programId: number): void {
    this.scopeProgramIds.update(set => {
      const next = new Set(set);
      next.delete(programId);
      return next;
    });
    this.unitQtyByProgram.update(map => {
      const { [programId]: _removed, ...rest } = map;
      return rest;
    });
  }

  unitQtyFor(programId: number): number {
    return this.unitQtyByProgram()[programId] ?? 0;
  }

  onUnitQtyChange(programId: number, value: string): void {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    this.unitQtyByProgram.update(map => ({ ...map, [programId]: qty }));
  }

  openScopeModal(): void {
    this.scopeModalSearch.set('');
    this.scopeModalSelected.set(new Set(this.scopeProgramIds()));
    this.showScopeModal.set(true);
  }

  closeScopeModal(): void {
    this.showScopeModal.set(false);
  }

  toggleScopeModalProgram(programId: number, checked: boolean): void {
    this.scopeModalSelected.update(set => {
      const next = new Set(set);
      if (checked) next.add(programId); else next.delete(programId);
      return next;
    });
  }

  filteredScopeModalPrograms(): CustomerProgram[] {
    const q = this.scopeModalSearch().trim().toLowerCase();
    const programs = this.allPrograms();
    if (!q) return programs;
    return programs.filter(p => p.programName.toLowerCase().includes(q));
  }

  confirmScopeModal(): void {
    const selected = this.scopeModalSelected();
    this.scopeProgramIds.set(new Set(selected));
    this.unitQtyByProgram.update(map => {
      const next: Record<number, number> = {};
      selected.forEach(id => { next[id] = map[id] ?? 0; });
      return next;
    });
    this.showScopeModal.set(false);
  }

  // ── Quota limits ─────────────────────────────────────────────────────────

  private async loadQuotas(ruleId: number): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const roleId = this.roleId;
    if (!tpId || !custId || roleId == null) return;
    try {
      this.quotas.set(await this.service.listQuotas(tpId, custId, roleId, ruleId));
    } catch {
      // Non-critical.
    }
  }

  private flattenCategories(nodes: CustomerProgramCategoryNode[], depth = 0): { progCatId: number; label: string }[] {
    const out: { progCatId: number; label: string }[] = [];
    for (const n of nodes) {
      out.push({ progCatId: n.progCatId, label: '—'.repeat(depth) + (depth ? ' ' : '') + n.categoryName });
      out.push(...this.flattenCategories(n.children, depth + 1));
    }
    return out;
  }

  async onQuotaProgramChange(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId || !this.quotaForm.programId) {
      this.quotaCategories.set([]);
      return;
    }
    try {
      const tree = await this.programsService.getTree(tpId, custId, this.quotaForm.programId);
      this.quotaCategories.set(this.flattenCategories(tree.categories));
    } catch {
      this.quotaCategories.set([]);
    }
  }

  openAddQuotaModal(): void {
    this.editingQuotaId.set(null);
    this.quotaForm = { ...BLANK_QUOTA_FORM, programId: this.allPrograms()[0]?.programId ?? 0 };
    this.quotaError.set(null);
    this.onQuotaProgramChange();
    this.showQuotaModal.set(true);
  }

  openEditQuotaModal(quota: RuleQuotaLimit): void {
    this.editingQuotaId.set(quota.quotaId);
    this.quotaForm = {
      programId: quota.programId, progCatId: quota.progCatId,
      limitType: quota.limitType, limitValue: quota.limitValue,
    };
    this.quotaError.set(null);
    this.onQuotaProgramChange();
    this.showQuotaModal.set(true);
  }

  closeQuotaModal(): void {
    this.showQuotaModal.set(false);
  }

  async saveQuota(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const roleId = this.roleId;
    const ruleId = this.ruleId;
    if (!tpId || !custId || roleId == null || ruleId == null) return;
    this.quotaSaving.set(true);
    this.quotaError.set(null);
    try {
      const id = this.editingQuotaId();
      if (id === null) {
        await this.service.createQuota(tpId, custId, roleId, ruleId, this.quotaForm);
      } else {
        await this.service.updateQuota(tpId, custId, roleId, ruleId, id, this.quotaForm);
      }
      this.showQuotaModal.set(false);
      await this.loadQuotas(ruleId);
    } catch (err) {
      this.quotaError.set(err instanceof Error ? err.message : 'Failed to save quota limit.');
    } finally {
      this.quotaSaving.set(false);
    }
  }

  openDeleteQuotaModal(quota: RuleQuotaLimit): void {
    this.deleteQuotaTarget.set(quota);
    this.showDeleteQuotaModal.set(true);
  }

  closeDeleteQuotaModal(): void {
    this.showDeleteQuotaModal.set(false);
    this.deleteQuotaTarget.set(null);
  }

  async confirmDeleteQuota(): Promise<void> {
    const target = this.deleteQuotaTarget();
    const tpId = this.tpId;
    const custId = this.customerId;
    const roleId = this.roleId;
    const ruleId = this.ruleId;
    if (!target || !tpId || !custId || roleId == null || ruleId == null) return;
    this.deletingQuota.set(true);
    try {
      await this.service.removeQuota(tpId, custId, roleId, ruleId, target.quotaId);
      this.closeDeleteQuotaModal();
      await this.loadQuotas(ruleId);
    } finally {
      this.deletingQuota.set(false);
    }
  }

  // ── Payment ledger chain ─────────────────────────────────────────────────

  private async loadLedgerChain(ruleId: number): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const roleId = this.roleId;
    if (!tpId || !custId || roleId == null) return;
    try {
      const chain = await this.service.getLedgerChain(tpId, custId, roleId, ruleId);
      const slots: (number | null)[] = [null, null, null];
      chain.forEach(slot => { slots[slot.precedence - 1] = slot.ledgerId; });
      this.slots.set(slots);
    } catch {
      // Leave the chain empty — editable from scratch.
    }
  }

  isLedgerUsedElsewhere(ledgerId: number, excludeIndex: number): boolean {
    return this.slots().some((v, i) => i !== excludeIndex && v === ledgerId);
  }

  activeLedgers(): CustomerPaymentLedger[] {
    return this.allLedgers().filter(l => l.status === 'ACTIVE');
  }

  onSlotChange(index: number, value: string): void {
    const ledgerId = value ? Number(value) : null;
    this.slots.update(slots => {
      const next = [...slots];
      next[index] = ledgerId;
      return next;
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async saveRule(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    const roleId = this.roleId;
    if (!tpId || !custId || roleId == null) return;
    this.submitted.set(true);
    if (!this.form.ruleName) return;

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const scopeItems = Array.from(this.scopeProgramIds()).map(programId => ({
        programId,
        unitQty: this.needsUnitScope ? (this.unitQtyByProgram()[programId] ?? 0) : null,
      }));
      const ledgerSlots = this.slots()
        .map((ledgerId, i) => ({ precedence: (i + 1) as 1 | 2 | 3, ledgerId }))
        .filter((s): s is { precedence: 1 | 2 | 3; ledgerId: number } => s.ledgerId != null);

      let ruleId = this.ruleId;
      if (ruleId === null) {
        const created = await this.service.create(tpId, custId, roleId, this.form);
        ruleId = created.ruleId;
      } else {
        await this.service.update(tpId, custId, roleId, ruleId, this.form);
      }

      if (this.form.scopeAllAssortments === 'N') {
        await this.service.setScope(tpId, custId, roleId, ruleId, scopeItems);
      }
      await this.service.setLedgerChain(tpId, custId, roleId, ruleId, ledgerSlots);

      this.router.navigate(['/partner', tpId, 'customers', custId, 'roles', roleId]);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save rule.');
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    const tpId = this.tpId;
    const custId = this.customerId;
    const roleId = this.roleId;
    this.router.navigate(['/partner', tpId, 'customers', custId, 'roles', roleId]);
  }
}
