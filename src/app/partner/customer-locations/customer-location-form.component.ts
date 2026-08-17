import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerLocationsService } from './customer-locations.service';
import { CustomerLocation, CustomerLocationForm } from './customer-location.model';

@Component({
  selector: 'app-customer-location-form',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './customer-location-form.component.html',
})
export class CustomerLocationFormComponent implements OnInit {
  @ViewChild('locationForm') locationFormRef!: NgForm;

  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerLocationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly parentOptions = signal<CustomerLocation[]>([]);

  isEdit = false;
  locId: number | null = null;
  customerId: number | null = null;

  formData: CustomerLocationForm = {
    parentId: null,
    locCode: '', locName: '', locType: 'REGION',
    city: '', province: '',
    status: 'ACTIVE',
  };

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  async ngOnInit(): Promise<void> {
    this.customerId = Number(this.route.snapshot.paramMap.get('customerId'));

    const idParam = this.route.snapshot.paramMap.get('locationId');
    if (idParam) {
      this.isEdit = true;
      this.locId = Number(idParam);
    }

    const tpId = this.tpId;
    if (tpId && this.customerId) await this.customerMode.ensure(tpId, this.customerId);
    if (tpId && this.customerId) await this.loadParentOptions();

    if (idParam) {
      if (!tpId || !this.customerId || this.locId == null) return;
      this.loading.set(true);
      try {
        this.prefill(await this.service.get(tpId, this.customerId, this.locId));
      } catch {
        this.error.set('Could not load location data.');
      } finally {
        this.loading.set(false);
      }
      return;
    }

    const parentId = (window.history.state as { parentId?: number }).parentId;
    if (parentId != null) {
      this.formData.parentId = parentId;
      this.formData.locType = 'STATION';
    }
  }

  private async loadParentOptions(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId || !this.customerId) return;
    try {
      const locs = await this.service.listAll(tpId, this.customerId);
      this.parentOptions.set(locs.filter(l => l.locId !== this.locId));
    } catch { /* non-critical */ }
  }

  private prefill(location: CustomerLocation): void {
    this.formData = {
      parentId: location.parentId ?? null,
      locCode:  location.locCode ?? '',
      locName:  location.locName ?? '',
      locType:  location.locType ?? 'REGION',
      city:     location.city ?? '',
      province: location.province ?? '',
      status:   location.status ?? 'ACTIVE',
    };
  }

  cancel(): void {
    this.router.navigate(['/partner', this.tpId, 'customers', this.customerId, 'locations']);
  }

  async save(): Promise<void> {
    if (this.locationFormRef.invalid) {
      this.locationFormRef.form.markAllAsTouched();
      return;
    }
    const tpId = this.tpId;
    if (!tpId || !this.customerId) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.locId != null) {
        await this.service.update(tpId, this.customerId, this.locId, this.formData);
      } else {
        await this.service.create(tpId, this.customerId, this.formData);
      }
      this.router.navigate(['/partner', tpId, 'customers', this.customerId, 'locations']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }
}
