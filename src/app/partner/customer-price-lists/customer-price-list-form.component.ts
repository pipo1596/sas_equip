import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerPriceListsService } from './customer-price-lists.service';
import { CustomerPriceList, CustomerPriceListForm } from './customer-price-list.model';
import { TpSettingsService } from '../../shared/tp-settings.service';

@Component({
  selector: 'app-customer-price-list-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './customer-price-list-form.component.html',
})
export class CustomerPriceListFormComponent implements OnInit {
  @ViewChild('priceListForm') priceListFormRef!: NgForm;

  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerPriceListsService);
  private readonly tpSettingsService = inject(TpSettingsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly orgCurrency = signal<'USD' | 'CAD'>('USD');

  isEdit = false;
  priceListId: number | null = null;
  customerId: number | null = null;

  formData: CustomerPriceListForm = {
    listName: '',
    versionCode: '',
    currency: 'USD',
    effectiveDate: '',
    endDate: '',
    description: '',
    status: 'DRAFT',
  };

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  async ngOnInit(): Promise<void> {
    this.customerId = Number(this.route.snapshot.paramMap.get('customerId'));

    const tpId = this.tpId;
    if (tpId && this.customerId) await this.customerMode.ensure(tpId, this.customerId);
    if (tpId) await this.loadOrgCurrency(tpId);
    this.formData.currency = this.orgCurrency();

    const idParam = this.route.snapshot.paramMap.get('priceListId');
    if (!idParam) return;

    this.isEdit = true;
    this.priceListId = Number(idParam);

    if (!tpId || !this.customerId) return;
    this.loading.set(true);
    try {
      this.prefill(await this.service.get(tpId, this.customerId, this.priceListId));
      this.formData.currency = this.orgCurrency();
    } catch {
      this.error.set('Could not load price list data.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadOrgCurrency(tpId: number): Promise<void> {
    try {
      const settings = await this.tpSettingsService.get(tpId);
      this.orgCurrency.set(settings.currency === 'CAD' ? 'CAD' : 'USD');
    } catch { /* non-critical — falls back to USD */ }
  }

  private prefill(priceList: CustomerPriceList): void {
    this.formData = {
      listName:      priceList.listName ?? '',
      versionCode:   priceList.versionCode ?? '',
      currency:      priceList.currency ?? 'USD',
      effectiveDate: priceList.effectiveDate ? priceList.effectiveDate.slice(0, 10) : '',
      endDate:       priceList.endDate ? priceList.endDate.slice(0, 10) : '',
      description:   priceList.description ?? '',
      status:        priceList.status ?? 'DRAFT',
    };
  }

  cancel(): void {
    this.router.navigate(['/partner', this.tpId, 'customers', this.customerId, 'price-lists']);
  }

  async save(): Promise<void> {
    if (this.priceListFormRef.invalid) {
      this.priceListFormRef.form.markAllAsTouched();
      return;
    }
    const tpId = this.tpId;
    if (!tpId || !this.customerId) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.priceListId != null) {
        await this.service.update(tpId, this.customerId, this.priceListId, this.formData);
      } else {
        await this.service.create(tpId, this.customerId, this.formData);
      }
      this.router.navigate(['/partner', tpId, 'customers', this.customerId, 'price-lists']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }
}
