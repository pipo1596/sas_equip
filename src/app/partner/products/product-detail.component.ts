import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { PartnerModeService } from '../partner-mode.service';
import { ImageUploadService } from '../../shared/image-upload.service';
import { ProductsService } from './products.service';
import { ProductImagesService } from './product-images.service';
import { ProductSkusService } from './product-skus.service';
import { BrandsService } from './brands.service';
import { CategoriesService } from './categories.service';
import { Brand } from './brand.model';
import { Category } from './category.model';
import {
  Product, ProductForm, ProductSku,
  ProductImage, ProductAttribute, ProductXref,
} from './product.model';

export type ProductTab = 'overview' | 'skus' | 'images' | 'categories' | 'attributes' | 'xrefs';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [FormsModule, RouterModule, DecimalPipe],
  templateUrl: './product-detail.component.html',
})
export class ProductDetailComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(ProductsService);
  private readonly skusService = inject(ProductSkusService);
  private readonly brandsService = inject(BrandsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly uploadService = inject(ImageUploadService);
  private readonly imagesService = inject(ProductImagesService);

  // ── Core state ────────────────────────────────────────────────────────────
  readonly product = signal<Product | null>(null);
  readonly productPk = signal<number | null>(null);
  readonly loadingProduct = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly titleMissing = signal(false);
  readonly handleMissing = signal(false);

  // ── Tab state ─────────────────────────────────────────────────────────────
  readonly activeTab = signal<ProductTab>('overview');
  readonly loadedTabs = signal<Set<ProductTab>>(new Set(['overview']));

  // ── Overview form ─────────────────────────────────────────────────────────
  readonly brands = signal<Brand[]>([]);
  overviewForm: ProductForm = {
    productId: '',
    brandId: null, handle: '', title: '',
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

  // ── SKUs ──────────────────────────────────────────────────────────────────
  readonly skus = signal<ProductSku[]>([]);
  readonly loadingSkus = signal(false);
  readonly showSkuDeleteModal = signal(false);
  readonly deletingSkus = signal(false);
  readonly skuDeleteTarget = signal<ProductSku | null>(null);

  // ── Images ────────────────────────────────────────────────────────────────
  readonly images = signal<ProductImage[]>([]);
  readonly loadingImages = signal(false);
  readonly uploadingImage = signal(false);
  readonly sortOrders = Array.from({ length: 50 }, (_, i) => i + 1);
  readonly uploadImageError = signal<string | null>(null);

  // ── Categories ────────────────────────────────────────────────────────────
  readonly allCategories = signal<Category[]>([]);
  readonly assignedCatIds = signal<Set<number>>(new Set());
  readonly primaryCatId = signal<number | null>(null);
  readonly loadingCategories = signal(false);
  readonly savingCategories = signal(false);

  // ── Attributes ────────────────────────────────────────────────────────────
  readonly attributes = signal<ProductAttribute[]>([]);
  readonly loadingAttributes = signal(false);
  readonly editingAttr = signal<ProductAttribute | null>(null);
  readonly attrForm = signal({ attrKey: '', attrValue: '', attrType: 'TEXT' as ProductAttribute['attrType'], isVisible: 'Y' as 'Y' | 'N', isSearchable: 'N' as 'Y' | 'N' });
  readonly savingAttr = signal(false);

  // ── Cross-refs ────────────────────────────────────────────────────────────
  readonly xrefs = signal<ProductXref[]>([]);
  readonly loadingXrefs = signal(false);
  readonly xrefForm = signal({ platformCd: '', extProductId: '', extSkuId: '', extUrl: '' });
  readonly savingXref = signal(false);

  readonly thumbnail = computed(() =>
    this.images().find(i => i.imageType === 'thumbnail') ?? this.images()[0] ?? null
  );

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('productId');
    if (!idParam) return;
    this.productPk.set(Number(idParam));

    const state = window.history.state as { product?: Product; tab?: string };
    const initialTab = state.tab as ProductTab | undefined;
    if (initialTab) this.setTab(initialTab);

    const stateProduct = state.product;
    if (stateProduct && stateProduct.productPk === Number(idParam)) {
      this.product.set(stateProduct);
      this.syncOverviewForm(stateProduct);
    }
    this.fetchProduct();
    this.loadBrands();
  }

  private async fetchProduct(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.loadingProduct.set(true);
    this.loadError.set(null);
    try {
      const p = await this.service.get(tpId, id);
      this.product.set(p);
      this.syncOverviewForm(p);
    } catch (err) {
      this.loadError.set(err instanceof Error ? err.message : 'Failed to load product.');
    } finally {
      this.loadingProduct.set(false);
    }
  }

  private syncOverviewForm(p: Product): void {
    this.overviewForm = {
      productId:      p.productId ?? '',
      brandId:        p.brandId,
      handle:         p.handle ?? '',
      title:          p.title ?? '',
      descr:          p.descr ?? '',
      longDescr:      p.longDescr ?? '',
      features:       p.features ?? '',
      construction:   p.construction ?? '',
      vendor:         p.vendor ?? '',
      productType:    p.productType ?? '',
      status:         p.status ?? 'DRAFT',
      published:      p.published ?? 'Y',
      giftCard:       p.giftCard ?? 'N',
      productCond:    p.productCond ?? '',
      allowBackorder: p.allowBackorder ?? 'N',
      assignEmbel:    p.assignEmbel ?? 'N',
      isVasable:      p.isVasable ?? 'N',
      tags:           p.tags ?? '',
      pageTitle:      p.pageTitle ?? '',
      seoDescr:       p.seoDescr ?? '',
      orderNote:      p.orderNote ?? '',
      techSpec:       p.techSpec ?? '',
      techSpecImg:    p.techSpecImg ?? '',
      taxCode:        p.taxCode ?? '',
      erpProdCode:    p.erpProdCode ?? '',
      mfrProdCode:    p.mfrProdCode ?? '',
      manufacturerId: p.manufacturerId ?? '',
      supplierCode:   p.supplierCode ?? '',
    };
  }

  private async loadBrands(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    try {
      this.brands.set(await this.brandsService.listAll(tpId));
    } catch { /* non-critical */ }
  }

  // ── Tab navigation ────────────────────────────────────────────────────────

  setTab(tab: ProductTab): void {
    this.activeTab.set(tab);
    if (tab === 'skus') { this.loadSkus(); return; }
    if (tab === 'images') { this.loadImages(); return; }
    const loaded = this.loadedTabs();
    if (!loaded.has(tab)) {
      this.loadedTabs.set(new Set([...loaded, tab]));
      this.loadTabData(tab);
    }
  }

  private loadTabData(tab: ProductTab): void {
    switch (tab) {
      case 'skus':       this.loadSkus(); break;
      case 'images':     this.loadImages(); break;
      case 'categories': this.loadCategoriesTab(); break;
      case 'attributes': this.loadAttributes(); break;
      case 'xrefs':      this.loadXrefs(); break;
    }
  }

  // ── Overview save ─────────────────────────────────────────────────────────

  async saveOverview(): Promise<void> {
    const titleOk = !!this.overviewForm.title?.trim();
    const handleOk = !!this.overviewForm.handle?.trim();
    this.titleMissing.set(!titleOk);
    this.handleMissing.set(!handleOk);
    if (!titleOk || !handleOk) {
      setTimeout(() => document.querySelector<HTMLElement>('.is-invalid')?.focus());
      return;
    }
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.service.update(tpId, id, this.overviewForm);
      this.product.update(p => p ? { ...p, ...this.overviewForm } : p);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }

  // ── SKUs ──────────────────────────────────────────────────────────────────

  private async loadSkus(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.loadingSkus.set(true);
    try {
      this.skus.set(await this.skusService.list(tpId, id));
    } catch { /* handled inline */ }
    finally { this.loadingSkus.set(false); }
  }

  openSku(sku: ProductSku): void {
    this.router.navigate(['/partner', this.tpId, 'products', this.productPk(), 'skus', sku.skuId], {
      state: { sku, product: this.product() },
    });
  }

  newSku(): void {
    this.router.navigate(['/partner', this.tpId, 'products', this.productPk(), 'skus', 'new'], {
      state: { product: this.product() },
    });
  }

  confirmSkuDelete(sku: ProductSku): void {
    this.skuDeleteTarget.set(sku);
    this.showSkuDeleteModal.set(true);
  }

  async deleteSkuConfirmed(): Promise<void> {
    const sku = this.skuDeleteTarget();
    const tpId = this.tpId;
    if (!sku || !tpId) return;
    this.deletingSkus.set(true);
    try {
      await this.skusService.remove(tpId, sku.skuId);
      this.skus.update(list => list.filter(s => s.skuId !== sku.skuId));
      this.showSkuDeleteModal.set(false);
      this.skuDeleteTarget.set(null);
    } catch { /* TODO: surface error */ }
    finally { this.deletingSkus.set(false); }
  }

  // ── Images ────────────────────────────────────────────────────────────────

  private async loadImages(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.loadingImages.set(true);
    try {
      this.images.set(await this.imagesService.get(tpId, id));
    } catch { /* handled inline */ }
    finally { this.loadingImages.set(false); }
  }

  async onImageFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.uploadingImage.set(true);
    this.uploadImageError.set(null);
    try {
      const imgUrl = await this.uploadService.upload('product_image', file, tpId, { tpId, productPk: id, subfolder: 'products' });
      await this.imagesService.add(tpId, id, imgUrl, 'large', '', this.images().length);
      this.images.set(await this.imagesService.get(tpId, id));
    } catch (err) {
      this.uploadImageError.set(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      this.uploadingImage.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  async setImageSortOrder(img: ProductImage, sortOrder: number): Promise<void> {
    const tpId = this.tpId;
    const productPk = this.productPk();
    if (!tpId || !productPk) return;
    try {
      await this.imagesService.updateSortOrder(tpId, productPk, img.imageId, sortOrder);
      this.images.update(list =>
        list.map(i => i.imageId === img.imageId ? { ...i, sortOrder } : i)
      );
    } catch { /* TODO: surface error */ }
  }

  async deleteImage(img: ProductImage): Promise<void> {
    if (!confirm('Delete this image? This cannot be undone.')) return;
    const tpId = this.tpId;
    const productPk = this.productPk();
    if (!tpId || !productPk) return;
    try {
      await this.imagesService.remove(tpId, productPk, img.imageId);
      this.images.update(list => list.filter(i => i.imageId !== img.imageId));
    } catch { /* TODO: surface error */ }
  }

  // ── Categories ────────────────────────────────────────────────────────────

  private async loadCategoriesTab(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.loadingCategories.set(true);
    try {
      const [allCats, assigned] = await Promise.all([
        this.categoriesService.listAll(tpId),
        this.service.listProductCategories(tpId, id),
      ]);
      this.allCategories.set(allCats);
      this.assignedCatIds.set(new Set(assigned.map(a => a.catId)));
      const primary = assigned.find(a => a.isPrimary === 'Y');
      this.primaryCatId.set(primary?.catId ?? null);
    } catch { /* handled inline */ }
    finally { this.loadingCategories.set(false); }
  }

  toggleCategory(catId: number): void {
    const current = this.assignedCatIds();
    const updated = new Set(current);
    if (updated.has(catId)) {
      updated.delete(catId);
      if (this.primaryCatId() === catId) this.primaryCatId.set(null);
    } else {
      updated.add(catId);
    }
    this.assignedCatIds.set(updated);
  }

  async saveCategories(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.savingCategories.set(true);
    try {
      const assignments = [...this.assignedCatIds()].map(catId => ({
        catId,
        isPrimary: (this.primaryCatId() === catId ? 'Y' : 'N') as 'Y' | 'N',
      }));
      await this.service.setProductCategories(tpId, id, assignments);
    } catch { /* TODO: surface error */ }
    finally { this.savingCategories.set(false); }
  }

  buildCategoryTree(cats: Category[]): Category[] {
    const map = new Map<number, Category & { level: number }>(
      cats.map(c => [c.catId, { ...c, level: 0 }])
    );
    const roots: Array<Category & { level: number }> = [];
    for (const cat of map.values()) {
      if (cat.parentCatId && map.has(cat.parentCatId)) {
        map.get(cat.parentCatId)!.level;
        cat.level = (map.get(cat.parentCatId)!.level ?? 0) + 1;
      } else {
        roots.push(cat);
      }
    }
    const result: Array<Category & { level: number }> = [];
    const visit = (catId: number) => {
      const node = map.get(catId);
      if (!node) return;
      result.push(node);
      for (const child of map.values()) {
        if (child.parentCatId === catId) visit(child.catId);
      }
    };
    roots.forEach(r => visit(r.catId));
    return result;
  }

  // ── Attributes ────────────────────────────────────────────────────────────

  private async loadAttributes(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.loadingAttributes.set(true);
    try {
      this.attributes.set(await this.service.listAttributes(tpId, id));
    } catch { /* handled inline */ }
    finally { this.loadingAttributes.set(false); }
  }

  startEditAttr(attr: ProductAttribute | null): void {
    this.editingAttr.set(attr);
    if (attr) {
      this.attrForm.set({
        attrKey: attr.attrKey,
        attrValue: attr.attrValue ?? '',
        attrType: attr.attrType,
        isVisible: attr.isVisible,
        isSearchable: attr.isSearchable,
      });
    } else {
      this.attrForm.set({ attrKey: '', attrValue: '', attrType: 'TEXT', isVisible: 'Y', isSearchable: 'N' });
    }
  }

  cancelEditAttr(): void {
    this.editingAttr.set(null);
  }

  async saveAttr(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    const form = this.attrForm();
    if (!tpId || !id || !form.attrKey.trim()) return;
    this.savingAttr.set(true);
    try {
      const existing = this.editingAttr();
      if (existing) {
        await this.service.updateAttribute(tpId, existing.attrId, { ...form, attrValue: form.attrValue });
        this.attributes.update(list =>
          list.map(a => a.attrId === existing.attrId ? { ...a, ...form } : a)
        );
      } else {
        const created = await this.service.addAttribute(tpId, {
          productPk: id, skuId: null,
          ...form, attrValue: form.attrValue, sortOrder: this.attributes().length,
        });
        this.attributes.update(list => [...list, created]);
      }
      this.editingAttr.set(null);
    } catch { /* TODO: surface error */ }
    finally { this.savingAttr.set(false); }
  }

  async deleteAttr(attr: ProductAttribute): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    try {
      await this.service.deleteAttribute(tpId, attr.attrId);
      this.attributes.update(list => list.filter(a => a.attrId !== attr.attrId));
    } catch { /* TODO: surface error */ }
  }

  // ── Cross-refs ────────────────────────────────────────────────────────────

  private async loadXrefs(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.loadingXrefs.set(true);
    try {
      this.xrefs.set(await this.service.listXrefs(tpId, id));
    } catch { /* handled inline */ }
    finally { this.loadingXrefs.set(false); }
  }

  async addXref(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    const form = this.xrefForm();
    if (!tpId || !id || !form.platformCd.trim()) return;
    this.savingXref.set(true);
    try {
      const created = await this.service.addXref(tpId, id, {
        platformCd: form.platformCd,
        extProductId: form.extProductId || null,
        extSkuId: form.extSkuId || null,
        extUrl: form.extUrl || null,
        skuId: null,
      });
      this.xrefs.update(list => [...list, created]);
      this.xrefForm.set({ platformCd: '', extProductId: '', extSkuId: '', extUrl: '' });
    } catch { /* TODO: surface error */ }
    finally { this.savingXref.set(false); }
  }

  async deleteXref(xref: ProductXref): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    try {
      await this.service.deleteXref(tpId, xref.xrefId);
      this.xrefs.update(list => list.filter(x => x.xrefId !== xref.xrefId));
    } catch { /* TODO: surface error */ }
  }

  backToList(): void {
    this.router.navigate(['/partner', this.tpId, 'products']);
  }

  statusBadge(status: string): string {
    switch (status) {
      case 'ACTIVE':   return 'badge bg-success-subtle text-success border border-success-subtle';
      case 'DRAFT':    return 'badge bg-secondary-subtle text-secondary border border-secondary-subtle';
      case 'ARCHIVED': return 'badge bg-warning-subtle text-warning border border-warning-subtle';
      default:         return 'badge bg-light text-dark';
    }
  }
}
