import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerAddressesService } from './customer-addresses.service';
import { CustomerAddress, CustomerAddressForm } from './customer-address.model';

interface AddressForm {
  addressType: 'BILL-TO' | 'SHIP-TO' | 'BOTH';
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  attention: string;
  phone: string;
  isPrimary: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

const BLANK_FORM: AddressForm = {
  addressType: 'BILL-TO', addressLine1: '', addressLine2: '', addressLine3: '',
  city: '', province: '', postalCode: '', country: 'US',
  attention: '', phone: '',
  isPrimary: false, status: 'ACTIVE',
};

const TYPE_LABELS: Record<string, string> = {
  'BILL-TO': 'Bill-to',
  'SHIP-TO': 'Ship-to',
  'BOTH':    'Bill-to & Ship-to',
};

@Component({
  selector: 'app-customer-addresses',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './customer-addresses.component.html',
})
export class CustomerAddressesComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerAddressesService);
  private readonly route = inject(ActivatedRoute);

  readonly addresses = signal<CustomerAddress[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly showFormModal = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly showDeleteModal = signal(false);
  readonly deleteTarget = signal<CustomerAddress | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly openMenuId = signal<number | null>(null);

  form: AddressForm = { ...BLANK_FORM };

  readonly addrTypes: { value: 'BILL-TO' | 'SHIP-TO' | 'BOTH'; label: string }[] = [
    { value: 'BILL-TO', label: 'Bill-to' },
    { value: 'SHIP-TO', label: 'Ship-to' },
    { value: 'BOTH',    label: 'Bill-to & Ship-to' },
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

  countryName(code: string): string {
    const names: Record<string, string> = { US: 'UNITED STATES', CA: 'CANADA' };
    return names[code] ?? code;
  }

  padIndex(i: number): string {
    return (i + 1).toString().padStart(3, '0');
  }

  get primaryConflict(): boolean {
    if (!this.form.isPrimary) return false;
    const id = this.editingId();
    return this.addresses().some(a => a.isPrimary === 'Y' && a.addressId !== id);
  }

  async ngOnInit(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (tpId && custId) await this.customerMode.ensure(tpId, custId);
    await this.loadAddresses();
  }

  async loadAddresses(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.addresses.set(await this.service.list(tpId, custId));
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load addresses.');
    } finally {
      this.loading.set(false);
    }
  }

  openAddModal(): void {
    this.editingId.set(null);
    this.form = { ...BLANK_FORM };
    this.saveError.set(null);
    this.submitted.set(false);
    this.showFormModal.set(true);
  }

  openEditModal(addr: CustomerAddress): void {
    this.editingId.set(addr.addressId);
    this.form = {
      addressType:  addr.addressType,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 ?? '',
      addressLine3: addr.addressLine3 ?? '',
      city:         addr.city,
      province:     addr.province,
      postalCode:   addr.postalCode,
      country:      addr.country,
      attention:    addr.attention ?? '',
      phone:        addr.phone ?? '',
      isPrimary:    addr.isPrimary === 'Y',
      status:       addr.status,
    };
    this.saveError.set(null);
    this.submitted.set(false);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  async saveAddress(): Promise<void> {
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!tpId || !custId) return;
    this.submitted.set(true);
    const f = this.form;
    if (!f.addressLine1 || !f.city || !f.province || !f.postalCode || !f.country) return;
    if (this.primaryConflict) {
      this.saveError.set('Another address is already marked as primary.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const payload: CustomerAddressForm = {
        addressType:  this.form.addressType,
        addressLine1: this.form.addressLine1,
        addressLine2: this.form.addressLine2,
        addressLine3: this.form.addressLine3,
        city:         this.form.city,
        province:     this.form.province,
        postalCode:   this.form.postalCode,
        country:      this.form.country,
        attention:    this.form.attention,
        phone:        this.form.phone,
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
      await this.loadAddresses();
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save address.');
    } finally {
      this.saving.set(false);
    }
  }

  openDeleteModal(addr: CustomerAddress): void {
    this.deleteTarget.set(addr);
    this.deleteError.set(null);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  async confirmDelete(): Promise<void> {
    const addr = this.deleteTarget();
    const tpId = this.tpId;
    const custId = this.customerId;
    if (!addr || !tpId || !custId) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.service.remove(tpId, custId, addr.addressId);
      this.showDeleteModal.set(false);
      this.deleteTarget.set(null);
      await this.loadAddresses();
    } catch (err) {
      this.deleteError.set(err instanceof Error ? err.message : 'Failed to delete address.');
    } finally {
      this.deleting.set(false);
    }
  }

  typeLabel(type: string): string {
    return TYPE_LABELS[type] ?? type;
  }

  formatAddress(addr: CustomerAddress): string {
    return [addr.addressLine1, addr.addressLine2, addr.addressLine3, addr.city, addr.province, addr.postalCode]
      .filter(Boolean)
      .join(', ');
  }
}
