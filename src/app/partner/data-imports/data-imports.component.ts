import { Component, inject, signal } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';
import { ImageUploadService } from '../../shared/image-upload.service';
import { ProductsService } from '../products/products.service';
import { CustomerEmployeesService } from '../customer-employees/customer-employees.service';
import { CustomerPriceListsService } from '../customer-price-lists/customer-price-lists.service';

@Component({
  selector: 'app-data-imports',
  standalone: true,
  templateUrl: './data-imports.component.html',
})
export class DataImportsComponent {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly imageUploadService = inject(ImageUploadService);
  private readonly productsService = inject(ProductsService);
  private readonly employeesService = inject(CustomerEmployeesService);
  private readonly priceListsService = inject(CustomerPriceListsService);

  readonly productUploading = signal(false);
  readonly productInducing = signal(false);
  readonly productError = signal<string | null>(null);
  readonly productSuccess = signal(false);

  readonly employeeUploading = signal(false);
  readonly employeeInducing = signal(false);
  readonly employeeError = signal<string | null>(null);
  readonly employeeSuccess = signal(false);

  readonly priceListUploading = signal(false);
  readonly priceListInducing = signal(false);
  readonly priceListError = signal<string | null>(null);
  readonly priceListSuccess = signal(false);

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  async onProductCsvSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const tpId = this.tpId;
    if (!tpId) return;

    this.productError.set(null);
    this.productSuccess.set(false);
    this.productUploading.set(true);

    let csvUrl: string;
    try {
      csvUrl = await this.imageUploadService.upload('product_csv', file, tpId, { tpId, subfolder: 'product_induction' }, 'products.csv');
    } catch (err) {
      this.productError.set(err instanceof Error ? err.message : 'CSV upload failed.');
      this.productUploading.set(false);
      return;
    }

    this.productUploading.set(false);
    this.productInducing.set(true);

    try {
      await this.productsService.inductFromCsv(tpId, csvUrl);
      this.productSuccess.set(true);
      setTimeout(() => this.productSuccess.set(false), 6000);
    } catch (err) {
      this.productError.set(err instanceof Error ? err.message : 'Product induction failed.');
    } finally {
      this.productInducing.set(false);
    }
  }

  async onEmployeeCsvSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const tpId = this.tpId;
    if (!tpId) return;

    this.employeeError.set(null);
    this.employeeSuccess.set(false);
    this.employeeUploading.set(true);

    let csvUrl: string;
    try {
      csvUrl = await this.imageUploadService.upload('employee_csv', file, tpId, { tpId, subfolder: 'employee_induction' }, 'employees.csv');
    } catch (err) {
      this.employeeError.set(err instanceof Error ? err.message : 'CSV upload failed.');
      this.employeeUploading.set(false);
      return;
    }

    this.employeeUploading.set(false);
    this.employeeInducing.set(true);

    try {
      await this.employeesService.inductFromCsv(tpId, csvUrl);
      this.employeeSuccess.set(true);
      setTimeout(() => this.employeeSuccess.set(false), 6000);
    } catch (err) {
      this.employeeError.set(err instanceof Error ? err.message : 'Employee induction failed.');
    } finally {
      this.employeeInducing.set(false);
    }
  }

  async onPriceListCsvSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const tpId = this.tpId;
    if (!tpId) return;

    this.priceListError.set(null);
    this.priceListSuccess.set(false);
    this.priceListUploading.set(true);

    let csvUrl: string;
    try {
      csvUrl = await this.imageUploadService.upload('price_list_csv', file, tpId, { tpId, subfolder: 'pricing_import' }, 'pricing.csv');
    } catch (err) {
      this.priceListError.set(err instanceof Error ? err.message : 'CSV upload failed.');
      this.priceListUploading.set(false);
      return;
    }

    this.priceListUploading.set(false);
    this.priceListInducing.set(true);

    try {
      await this.priceListsService.inductFromCsv(tpId, csvUrl);
      this.priceListSuccess.set(true);
      setTimeout(() => this.priceListSuccess.set(false), 6000);
    } catch (err) {
      this.priceListError.set(err instanceof Error ? err.message : 'Price list induction failed.');
    } finally {
      this.priceListInducing.set(false);
    }
  }
}
