import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerModeService } from '../partner-mode.service';
import { TpAddressService } from '../../shared/tp-address.service';
import { TpAddress } from '../../shared/tp-address.model';

interface AddressForm {
  addr_type:  'BILL-TO' | 'SHIP-TO' | 'BOTH';
  addrline1:  string;
  addrline2:  string;
  city:       string;
  province:   string;
  postlcode:  string;
  country:    string;
  is_primary: boolean;
  status:     'ACTIVE' | 'INACTIVE';
}

const BLANK_FORM: AddressForm = {
  addr_type: 'BILL-TO', addrline1: '', addrline2: '',
  city: '', province: '', postlcode: '', country: 'US', is_primary: false, status: 'ACTIVE',
};

const TYPE_LABELS: Record<string, string> = {
  'BILL-TO': 'Bill-to',
  'SHIP-TO': 'Ship-to',
  'BOTH':    'Bill-to & Ship-to',
};

@Component({
  selector: 'app-partner-settings-address',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-settings-address.component.html',
})
export class PartnerSettingsAddressComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(TpAddressService);

  readonly addresses = signal<TpAddress[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly showFormModal = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly showDeleteModal = signal(false);
  readonly deleteTarget = signal<TpAddress | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  form: AddressForm = { ...BLANK_FORM };

  readonly addrTypes: { value: 'BILL-TO' | 'SHIP-TO' | 'BOTH'; label: string }[] = [
    { value: 'BILL-TO', label: 'Bill-to' },
    { value: 'SHIP-TO', label: 'Ship-to' },
    { value: 'BOTH',    label: 'Bill-to & Ship-to' },
  ];

  readonly openMenuId = signal<number | null>(null);

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
    if (!this.form.is_primary) return false;
    const id = this.editingId();
    return this.addresses().some(a => a.is_primary === 'Y' && a.addr_id !== id);
  }


  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  async ngOnInit(): Promise<void> {
    await this.loadAddresses();
  }

  async loadAddresses(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.addresses.set(await this.service.list(tpId));
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

  openEditModal(addr: TpAddress): void {
    this.editingId.set(addr.addr_id);
    this.form = {
      addr_type:  addr.addr_type,
      addrline1:  addr.addrline1,
      addrline2:  addr.addrline2 ?? '',
      city:       addr.city,
      province:   addr.province,
      postlcode:  addr.postlcode,
      country:    addr.country,
      is_primary: addr.is_primary === 'Y',
      status:     addr.status,
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
    if (!tpId) return;
    this.submitted.set(true);
    const f = this.form;
    if (!f.addrline1 || !f.city || !f.province || !f.postlcode || !f.country) return;
    if (this.primaryConflict) {
      this.saveError.set('Another address is already marked as primary.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const payload: Partial<TpAddress> = {
        addr_type:  this.form.addr_type,
        addrline1:  this.form.addrline1,
        addrline2:  this.form.addrline2 || null,
        city:       this.form.city,
        province:   this.form.province,
        postlcode:  this.form.postlcode,
        country:    this.form.country,
        is_primary: this.form.is_primary ? 'Y' : 'N',
        status:     this.form.status,
      };
      const id = this.editingId();
      if (id === null) {
        await this.service.add(tpId, payload);
      } else {
        await this.service.update(tpId, id, payload);
      }
      this.showFormModal.set(false);
      await this.loadAddresses();
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to save address.');
    } finally {
      this.saving.set(false);
    }
  }

  openDeleteModal(addr: TpAddress): void {
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
    if (!addr || !tpId) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.service.remove(tpId, addr.addr_id);
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

  formatAddress(addr: TpAddress): string {
    return [addr.addrline1, addr.addrline2, addr.city, addr.province, addr.postlcode]
      .filter(Boolean)
      .join(', ');
  }
}
