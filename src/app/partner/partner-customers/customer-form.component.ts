import { ChangeDetectorRef, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { CustomersService } from './customers.service';
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  isEdit = false;
  custId: number | null = null;

  formData: CustomerForm = {
    customerName: '', customerNmbr: '', erpAccountNmbr: '',
    customerType: '', status: 'ACTIVE',
    customerUrl: '', notes: '',
  };

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('customerId');
    if (!idParam) return;

    this.isEdit = true;
    this.custId = Number(idParam);

    const tpId = this.tpId;
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

  private prefill(customer: Customer): void {
    this.formData = {
      customerName:    customer.customerName ?? '',
      customerNmbr:    customer.customerNmbr ?? '',
      erpAccountNmbr:  customer.erpAccountNmbr ?? '',
      customerType:    customer.customerType ?? '',
      status:          customer.status ?? 'ACTIVE',
      customerUrl:     customer.customerUrl ?? '',
      notes:           customer.notes ?? '',
    };
    this.cdr.markForCheck();
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
