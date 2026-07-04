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
  productPk: number | null = null;
  handleAutoSync = true;

  formData: ProductForm = {
    productId: '',
    brandId: null,
    handle: '', title: '',
    descr: '', longDescr: '', features: '', construction: '',
    vendor: '', productType: '',
    status: 'DRAFT', published: 'Y',
    giftCard: 'N', productCond: '',
    allowBackorder: 'N', assignEmbel: 'N', isVasable: 'N',
    tags: '', pageTitle: '', seoDescr: '',
    orderNote: '', techSpec: '', techSpecImg: '',
    taxCode: '', erpProdCode: '', mfrProdCode: '',
    manufacturerId: '', supplierCode: '',
  };

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  onTitleChange(value: string): void {
    this.formData.title = value;
    if (!this.isEdit && this.handleAutoSync) {
      this.formData.handle = this.slugify(value);
    }
  }

  onHandleChange(value: string): void {
    this.formData.handle = value;
    this.handleAutoSync = false;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('productId');
    if (idParam) {
      this.isEdit = true;
      this.handleAutoSync = false;
      this.productPk = Number(idParam);
      const product = (window.history.state as { product?: Product }).product;
      if (product && product.productPk === this.productPk) {
        this.prefill(product);
      }
    }
    this.loadBrands();
  }

  private prefill(p: Product): void {
    this.formData = {
      productId:     p.productId ?? '',
      brandId:       p.brandId,
      handle:        p.handle ?? '',
      title:         p.title ?? '',
      descr:         p.descr ?? '',
      longDescr:     p.longDescr ?? '',
      features:      p.features ?? '',
      construction:  p.construction ?? '',
      vendor:        p.vendor ?? '',
      productType:   p.productType ?? '',
      status:        p.status ?? 'DRAFT',
      published:     p.published ?? 'Y',
      giftCard:      p.giftCard ?? 'N',
      productCond:   p.productCond ?? '',
      allowBackorder: p.allowBackorder ?? 'N',
      assignEmbel:   p.assignEmbel ?? 'N',
      isVasable:     p.isVasable ?? 'N',
      tags:          p.tags ?? '',
      pageTitle:     p.pageTitle ?? '',
      seoDescr:      p.seoDescr ?? '',
      orderNote:     p.orderNote ?? '',
      techSpec:      p.techSpec ?? '',
      techSpecImg:   p.techSpecImg ?? '',
      taxCode:       p.taxCode ?? '',
      erpProdCode:   p.erpProdCode ?? '',
      mfrProdCode:   p.mfrProdCode ?? '',
      manufacturerId: p.manufacturerId ?? '',
      supplierCode:  p.supplierCode ?? '',
    };
  }

  private async loadBrands(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    try {
      this.brands.set(await this.brandsService.listAll(tpId));
    } catch { /* non-critical */ }
  }

  cancel(): void {
    this.router.navigate(['/partner', this.tpId, 'products']);
  }

  async save(): Promise<void> {
    if (this.productForm.invalid) {
      this.productForm.form.markAllAsTouched();
      setTimeout(() => document.querySelector<HTMLElement>('.is-invalid')?.focus());
      return;
    }
    const tpId = this.tpId;
    if (!tpId) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.productPk != null) {
        await this.service.update(tpId, this.productPk, this.formData);
        this.router.navigate(['/partner', tpId, 'products', this.productPk]);
      } else {
        const created = await this.service.create(tpId, this.formData);
        this.router.navigate(['/partner', tpId, 'products', created.productPk]);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
