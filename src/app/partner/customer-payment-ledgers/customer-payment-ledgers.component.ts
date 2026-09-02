import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerPaymentLedgersService } from './customer-payment-ledgers.service';
import { CustomerPaymentLedger, CustomerPaymentLedgerForm } from './customer-payment-ledger.model';

interface LedgerForm {
  ledgerName: string;
  ledgerType: 'DOLLAR' | 'POINTS' | 'CREDIT_CARD';
  amount: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

const BLANK_FORM: LedgerForm = { ledgerName: '', ledgerType: 'DOLLAR', amount: null, status: 'ACTIVE' };

@Component({
  selector: 'app-customer-payment-ledgers',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './customer-payment-ledgers.component.html',
})
export class CustomerPaymentLedgersComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerPaymentLedgersService);
  private readonly route = inject(ActivatedRoute);

  readonly ledgers = signal<CustomerPaymentLedger[]>([]);
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

  readonly showDeleteModal = signal(false);
  readonly deleting = signal(false);
  readonly deleteTarget = signal<CustomerPaymentLedger | null>(null);

  form: LedgerForm = { ...BLANK_FORM };

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

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
    await this.loadLedgers();
  }

  async loadLedgers(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list(tpId, custId, {
        page: this.page(), pageSize: this.pageSize(), search: this.search(),
      });
      this.ledgers.set(result.data);
      this.total.set(result.pagination.totalRows);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load payment ledgers.');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.loadLedgers(); }, 350);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadLedgers();
  }

  openAddModal(): void {
    this.editingId.set(null);
    this.form = { ...BLANK_FORM };
    this.saveError.set(null);
    this.submitted.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(ledger: CustomerPaymentLedger): void {
    this.editingId.set(ledger.ledgerId);
    this.form = {
      ledgerName: ledger.ledgerName, ledgerType: ledger.ledgerType,
      amount: ledger.amount, status: ledger.status,
    };
    this.saveError.set(null);
    this.submitted.set(false);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  onLedgerTypeChange(): void {
    if (this.form.ledgerType === 'CREDIT_CARD') this.form.amount = null;
  }

  async saveLedger(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    this.submitted.set(true);
    if (!this.form.ledgerName) return;

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const payload: CustomerPaymentLedgerForm = { ...this.form };
      const id = this.editingId();
      if (id === null) {
        await this.service.create(tpId, custId, payload);
      } else {
        await this.service.update(tpId, custId, id, payload);
      }
      this.showFormModal.set(false);
      await this.loadLedgers();
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save payment ledger.');
    } finally {
      this.saving.set(false);
    }
  }

  openDeleteModal(ledger: CustomerPaymentLedger): void {
    this.deleteTarget.set(ledger);
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
      await this.service.remove(tpId, custId, target.ledgerId);
      this.closeDeleteModal();
      if (this.ledgers().length === 1 && this.page() > 1) this.page.update(p => p - 1);
      await this.loadLedgers();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Delete failed.');
      this.closeDeleteModal();
    } finally {
      this.deleting.set(false);
    }
  }

  typeBadge(type: string): string {
    switch (type) {
      case 'CREDIT_CARD': return 'badge border border-warning-subtle text-warning-emphasis bg-warning-subtle';
      case 'POINTS': return 'badge border border-info-subtle text-info bg-info-subtle';
      default: return 'badge border border-success-subtle text-success bg-success-subtle';
    }
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'CREDIT_CARD': return 'Credit Card';
      case 'POINTS': return 'Points';
      default: return 'Dollar';
    }
  }

  amountLabel(ledger: CustomerPaymentLedger): string {
    if (ledger.ledgerType === 'CREDIT_CARD') return '—';
    if (ledger.amount == null) return 'Unlimited';
    return ledger.ledgerType === 'POINTS' ? `${ledger.amount} pts` : `$${ledger.amount.toFixed(2)}`;
  }

  statusBadge(status: string): string {
    return status === 'ACTIVE'
      ? 'badge bg-success-subtle text-success border border-success-subtle'
      : 'badge bg-secondary-subtle text-secondary border border-secondary-subtle';
  }
}
