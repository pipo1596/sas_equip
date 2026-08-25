import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerProgramsService } from './customer-programs.service';
import { CustomerProgram, CustomerProgramForm } from './customer-program.model';
import { CustomerPriceListsService } from '../customer-price-lists/customer-price-lists.service';
import { CustomerPriceList } from '../customer-price-lists/customer-price-list.model';

@Component({
  selector: 'app-customer-program-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './customer-program-form.component.html',
})
export class CustomerProgramFormComponent implements OnInit {
  @ViewChild('programForm') programFormRef!: NgForm;

  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerProgramsService);
  private readonly priceListsService = inject(CustomerPriceListsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly priceLists = signal<CustomerPriceList[]>([]);
  readonly genMode = signal<'MANUAL' | 'GENERATE'>('MANUAL');

  isEdit = false;
  programId: number | null = null;
  customerId: number | null = null;

  formData: CustomerProgramForm = {
    programName: '',
    priceListId: null,
    status: 'DRAFT',
    description: '',
  };

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  async ngOnInit(): Promise<void> {
    this.customerId = Number(this.route.snapshot.paramMap.get('customerId'));

    const tpId = this.tpId;
    if (tpId && this.customerId) await this.customerMode.ensure(tpId, this.customerId);
    if (tpId && this.customerId) this.loadPriceLists(tpId, this.customerId);

    const idParam = this.route.snapshot.paramMap.get('programId');
    if (!idParam) return;

    this.isEdit = true;
    this.programId = Number(idParam);

    if (!tpId || !this.customerId) return;
    this.loading.set(true);
    try {
      this.prefill(await this.service.get(tpId, this.customerId, this.programId));
    } catch {
      this.error.set('Could not load program data.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPriceLists(tpId: number, custId: number): Promise<void> {
    try {
      this.priceLists.set(await this.priceListsService.listAll(tpId, custId));
    } catch { /* non-critical — dropdown just shows no options */ }
  }

  private prefill(program: CustomerProgram): void {
    this.formData = {
      programName: program.programName ?? '',
      priceListId: program.priceListId ?? null,
      status:      program.status ?? 'DRAFT',
      description: program.description ?? '',
    };
  }

  canGenerate(): boolean {
    return !!this.formData.priceListId;
  }

  chooseMode(mode: 'MANUAL' | 'GENERATE'): void {
    if (mode === 'GENERATE' && !this.canGenerate()) return;
    this.genMode.set(mode);
  }

  onPriceListChange(value: number | null): void {
    this.formData.priceListId = value;
    if (!value) this.genMode.set('MANUAL');
  }

  cancel(): void {
    this.router.navigate(['/partner', this.tpId, 'customers', this.customerId, 'uniform-programs']);
  }

  async save(): Promise<void> {
    if (this.programFormRef.invalid) {
      this.programFormRef.form.markAllAsTouched();
      return;
    }
    const tpId = this.tpId;
    if (!tpId || !this.customerId) return;
    const generating = !this.isEdit && this.genMode() === 'GENERATE';
    if (generating && !this.formData.priceListId) {
      this.error.set('Please select a price list to generate this program from.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.programId != null) {
        await this.service.update(tpId, this.customerId, this.programId, this.formData);
        this.router.navigate(['/partner', tpId, 'customers', this.customerId, 'uniform-programs']);
      } else {
        const program = await this.service.create(tpId, this.customerId, this.formData);
        if (generating) {
          await this.service.regenerate(tpId, this.customerId, program.programId);
          this.router.navigate(['/partner', tpId, 'customers', this.customerId, 'uniform-programs', program.programId, 'tree']);
        } else {
          this.router.navigate(['/partner', tpId, 'customers', this.customerId, 'uniform-programs']);
        }
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }
}
