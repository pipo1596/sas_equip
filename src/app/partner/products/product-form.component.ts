import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { ProductsService } from './products.service';
import { BrandsService } from './brands.service';
import { Brand } from './brand.model';
import { Product, ProductForm } from './product.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent implements OnInit {
  @ViewChild('productForm') productForm!: NgForm;

  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(ProductsService);
  private readonly brandsService = inject(BrandsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly brands = signal<Brand[]>([]);

  isEdit = false;
  productId: number | null = null;

  formData: ProductForm = {
    brandId: null,
    handle: '',
    title: '',
    descr: '',
    vendor: '',
    tags: '',
    pageTitle: '',
    seoDescr: '',
    status: 'DRAFT',
    notes: '',
  };

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('productId');
    if (idParam) {
      this.isEdit = true;
      this.productId = Number(idParam);
      const product = (window.history.state as { product?: Product }).product;
      if (product && product.productId === this.productId) {
        this.formData = {
          brandId: product.brandId,
          handle: product.handle ?? '',
          title: product.title ?? '',
          descr: product.descr ?? '',
          vendor: product.vendor ?? '',
          tags: product.tags ?? '',
          pageTitle: product.pageTitle ?? '',
          seoDescr: product.seoDescr ?? '',
          status: product.status ?? 'DRAFT',
          notes: product.notes ?? '',
        };
      }
    }
    this.loadBrands();
  }

  private async loadBrands(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    try {
      const brands = await this.brandsService.listAll(tpId);
      this.brands.set(brands);
    } catch {
      // non-critical
    }
  }

  slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  onTitleChange(value: string): void {
    this.formData.title = value;
    if (!this.isEdit && !this.formData.handle) {
      this.formData.handle = this.slugify(value);
    }
  }

  cancel(): void {
    this.router.navigate(['/partner', this.tpId, 'products']);
  }

  async save(): Promise<void> {
    if (this.productForm.invalid) {
      this.productForm.form.markAllAsTouched();
      return;
    }
    const tpId = this.tpId;
    if (!tpId) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.productId != null) {
        await this.service.update(tpId, this.productId, this.formData);
        this.router.navigate(['/partner', tpId, 'products', this.productId]);
      } else {
        const created = await this.service.create(tpId, this.formData);
        this.router.navigate(['/partner', tpId, 'products', created.productId]);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
