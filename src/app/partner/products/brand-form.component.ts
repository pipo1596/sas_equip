import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { BrandsService } from './brands.service';
import { ImageUploadService } from '../../shared/image-upload.service';
import { Brand, BrandForm } from './brand.model';

@Component({
  selector: 'app-brand-form',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './brand-form.component.html',
})
export class BrandFormComponent implements OnInit {
  @ViewChild('brandForm') brandFormRef!: NgForm;

  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(BrandsService);
  private readonly uploadService = inject(ImageUploadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly uploadingLogo = signal(false);
  readonly uploadError = signal<string | null>(null);

  isEdit = false;
  brandId: number | null = null;
  slugAutoSync = true;

  formData: BrandForm = {
    brandName: '', brandSlug: '', brandDescr: '',
    logoUrl: '', websiteUrl: '',
    status: 'ACTIVE',
    supplierCode: '', manufacturerId: '', bcBrandId: null,
  };

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  onNameChange(value: string): void {
    this.formData.brandName = value;
    if (!this.isEdit && this.slugAutoSync) {
      this.formData.brandSlug = this.slugify(value);
    }
  }

  onSlugChange(value: string): void {
    this.formData.brandSlug = value;
    this.slugAutoSync = false;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('brandId');
    if (idParam) {
      this.isEdit = true;
      this.brandId = Number(idParam);
      const brand = (window.history.state as { brand?: Brand }).brand;
      if (brand && brand.brandId === this.brandId) {
        this.formData = {
          brandName:      brand.brandName ?? '',
          brandSlug:      brand.brandSlug ?? '',
          brandDescr:     brand.brandDescr ?? '',
          logoUrl:        brand.logoUrl ?? '',
          websiteUrl:     brand.websiteUrl ?? '',
          status:         brand.status ?? 'ACTIVE',
          supplierCode:   brand.supplierCode ?? '',
          manufacturerId: brand.manufacturerId ?? '',
          bcBrandId:      brand.bcBrandId ?? null,
        };
      }
    }
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
      this.formData.logoUrl = await this.uploadService.upload('brand_logo', file, tpId, { tpId ,subfolder: 'brands'});
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
    this.router.navigate(['/partner', this.tpId, 'products', 'brands']);
  }

  async save(): Promise<void> {
    if (this.brandFormRef.invalid) {
      this.brandFormRef.form.markAllAsTouched();
      return;
    }
    const tpId = this.tpId;
    if (!tpId) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.brandId != null) {
        await this.service.update(tpId, this.brandId, this.formData);
      } else {
        await this.service.create(tpId, this.formData);
      }
      this.router.navigate(['/partner', tpId, 'products', 'brands']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }
}
