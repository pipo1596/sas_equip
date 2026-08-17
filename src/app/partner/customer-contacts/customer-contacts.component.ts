import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerContactsService } from './customer-contacts.service';
import { CustomerContact, CustomerContactForm } from './customer-contact.model';

interface ContactForm {
  contactName: string;
  contactTitle: string;
  contactType: 'MAIN' | 'BILLING' | 'SUPPORT' | 'EMERGENCY' | 'OTHER';
  contactEmail: string;
  contactPhone: string;
  notes: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

const BLANK_FORM: ContactForm = {
  contactName: '', contactTitle: '', contactType: 'OTHER',
  contactEmail: '', contactPhone: '', notes: '',
  isPrimary: false, status: 'ACTIVE',
};

const TYPE_LABELS: Record<string, string> = {
  MAIN:      'Main',
  BILLING:   'Billing',
  SUPPORT:   'Support',
  EMERGENCY: 'Emergency',
  OTHER:     'Other',
};

const TYPE_ICONS: Record<string, string> = {
  MAIN:      'bi-person-fill',
  BILLING:   'bi-receipt',
  SUPPORT:   'bi-headset',
  EMERGENCY: 'bi-exclamation-octagon',
  OTHER:     'bi-person',
};

@Component({
  selector: 'app-customer-contacts',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './customer-contacts.component.html',
})
export class CustomerContactsComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerContactsService);
  private readonly route = inject(ActivatedRoute);

  readonly contacts = signal<CustomerContact[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly showFormModal = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly emailError = signal(false);

  readonly showDeleteModal = signal(false);
  readonly deleteTarget = signal<CustomerContact | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly openMenuId = signal<number | null>(null);

  form: ContactForm = { ...BLANK_FORM };

  readonly contactTypes: { value: ContactForm['contactType']; label: string }[] = [
    { value: 'MAIN',      label: 'Main' },
    { value: 'BILLING',   label: 'Billing' },
    { value: 'SUPPORT',   label: 'Support' },
    { value: 'EMERGENCY', label: 'Emergency' },
    { value: 'OTHER',     label: 'Other' },
  ];

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  protected get customerId(): number | null {
    const idParam = this.route.snapshot.paramMap.get('customerId');
    return idParam ? Number(idParam) : null;
  }

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  get primaryConflict(): boolean {
    if (!this.form.isPrimary) return false;
    const id = this.editingId();
    return this.contacts().some(c => c.isPrimary === 'Y' && c.contactId !== id);
  }

  private validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async ngOnInit(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (tpId && custId) await this.customerMode.ensure(tpId, custId);
    await this.loadContacts();
  }

  async loadContacts(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.contacts.set(await this.service.list(tpId, custId));
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load contacts.');
    } finally {
      this.loading.set(false);
    }
  }

  openAddModal(): void {
    this.editingId.set(null);
    this.form = { ...BLANK_FORM };
    this.saveError.set(null);
    this.submitted.set(false);
    this.emailError.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(contact: CustomerContact): void {
    this.editingId.set(contact.contactId);
    this.form = {
      contactName:  contact.contactName,
      contactTitle: contact.contactTitle ?? '',
      contactType:  contact.contactType,
      contactEmail: contact.contactEmail,
      contactPhone: contact.contactPhone ?? '',
      notes:        contact.notes ?? '',
      isPrimary:    contact.isPrimary === 'Y',
      status:       contact.status,
    };
    this.saveError.set(null);
    this.submitted.set(false);
    this.emailError.set(false);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  async saveContact(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    this.submitted.set(true);
    const f = this.form;
    this.emailError.set(!this.validateEmail(f.contactEmail));
    if (!f.contactName || !f.contactEmail || this.emailError()) return;
    if (this.primaryConflict) {
      this.saveError.set('Another contact is already marked as primary.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const payload: CustomerContactForm = {
        contactName:  this.form.contactName,
        contactTitle: this.form.contactTitle,
        contactType:  this.form.contactType,
        contactEmail: this.form.contactEmail,
        contactPhone: this.form.contactPhone,
        notes:        this.form.notes,
        isPrimary:    this.form.isPrimary ? 'Y' : 'N',
        status:       this.form.status,
      };
      const id = this.editingId();
      if (id === null) {
        await this.service.create(tpId, custId, payload);
      } else {
        await this.service.update(tpId, custId, id, payload);
      }
      this.showFormModal.set(false);
      await this.loadContacts();
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save contact.');
    } finally {
      this.saving.set(false);
    }
  }

  openDeleteModal(contact: CustomerContact): void {
    this.deleteTarget.set(contact);
    this.deleteError.set(null);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  async confirmDelete(): Promise<void> {
    const contact = this.deleteTarget();
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!contact || !tpId || !custId) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.service.remove(tpId, custId, contact.contactId);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      await this.loadContacts();
    } catch (err) {
      this.deleteError.set(err instanceof Error ? err.message : 'Failed to delete contact.');
    } finally {
      this.deleting.set(false);
    }
  }

  typeLabel(type: string): string {
    return TYPE_LABELS[type] ?? type;
  }

  typeIcon(type: string): string {
    return TYPE_ICONS[type] ?? 'bi-person';
  }
}
