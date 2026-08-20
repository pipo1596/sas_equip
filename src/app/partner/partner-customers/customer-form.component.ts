import { ChangeDetectorRef, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { CustomersService } from './customers.service';
import { ImageUploadService } from '../../shared/image-upload.service';
import { TenantPartnersService } from '../../admin/tenant-partners/tenant-partners.service';
import { Customer, CustomerForm } from './customer.model';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './customer-form.component.html',
})
export class CustomerFormComponent implements OnInit {
  @ViewChild('customerForm') customerFormRef!: NgForm;

  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(CustomersService);
  private readonly uploadService = inject(ImageUploadService);
  private readonly tenantPartnersService = inject(TenantPartnersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly uploadingLogo = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly portalBaseDomain = signal<string | null>(null);

  isEdit = false;
  custId: number | null = null;

  formData: CustomerForm = {
    customerName: '', customerNmbr: '', erpAcctNmbr: '',
    customerType: '', status: 'ACTIVE',
    customerUrl: '', notes: '', logoUrl: '',
  };

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  async ngOnInit(): Promise<void> {
    const tpId = this.tpId;
    if (tpId) this.loadPortalBaseDomain(tpId);

    const idParam = this.route.snapshot.paramMap.get('customerId');
    if (!idParam) return;

    this.isEdit = true;
    this.custId = Number(idParam);

    if (!tpId) return;
    this.loading.set(true);
    try {
      this.prefill(await this.service.get(tpId, this.custId));
    } catch {
      this.error.set('Could not load customer data.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPortalBaseDomain(tpId: number): Promise<void> {
    try {
      const partner = await this.tenantPartnersService.get(tpId);
      this.portalBaseDomain.set(partner.portalBaseDomain);
    } catch { /* non-critical */ }
  }

  private prefill(customer: Customer): void {
    this.formData = {
      customerName:    customer.customerName ?? '',
      customerNmbr:    customer.customerNmbr ?? '',
      erpAcctNmbr:  customer.erpAcctNmbr ?? '',
      customerType:    customer.customerType ?? '',
      status:          customer.status ?? 'ACTIVE',
      customerUrl:     customer.customerUrl ?? '',
      notes:           customer.notes ?? '',
      logoUrl:         customer.logoUrl ?? '',
    };
    this.cdr.markForCheck();
  }

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const tpId = this.tpId;
    if (!tpId) return;
    this.uploadingLogo.set(true);
    this.uploadError.set(null);
    try {
      this.formData.logoUrl = await this.uploadService.upload('customer_logo', file, tpId, { tpId, subfolder: 'customers' });
    } catch (err) {
      this.uploadError.set(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      this.uploadingLogo.set(false);
    }
  }

  removeLogo(): void {
    this.formData.logoUrl = '';
  }

  cancel(): void {
    this.router.navigate(['/partner', this.tpId, 'customers']);
  }

  async save(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.custId != null) {
        await this.service.update(tpId, this.custId, this.formData);
      } else {
        await this.service.create(tpId, this.formData);
      }
      this.router.navigate(['/partner', tpId, 'customers']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }
}
