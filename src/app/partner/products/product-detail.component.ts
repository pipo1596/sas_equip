import { Component, OnInit, inject, signal, computed, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { QuillEditorComponent } from 'ngx-quill';
import type { ContentChange } from 'ngx-quill';
import { PartnerModeService } from '../partner-mode.service';
import { ImageUploadService } from '../../shared/image-upload.service';
import { ProductsService } from './products.service';
import { ProductOptionsService } from './product-options.service';
import { ProductImagesService } from './product-images.service';
import { ProductSkusService } from './product-skus.service';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';
import { Brand } from '../brands/brand.model';
import { Category } from '../categories/category.model';
import {
  Product, ProductForm, ProductSku, ProductSkuForm,
  ProductImage, ProductAttribute,
} from './product.model';

export type ProductTab = 'overview' | 'skus' | 'options' | 'images' | 'categories' | 'attributes';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [FormsModule, RouterModule, DecimalPipe, NgClass, QuillEditorComponent],
  templateUrl: './product-detail.component.html',
})
export class ProductDetailComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(ProductsService);
  private readonly optionsService = inject(ProductOptionsService);
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

  // ── Rich-text editor ──────────────────────────────────────────────────────
  readonly LIMIT_1M = 1_048_576;
  readonly LIMIT_64K = 65_536;

  readonly editorModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'clean'],
    ],
  };

  readonly longDescrCount    = signal(0);
  readonly featuresCount     = signal(0);
  readonly constructionCount = signal(0);
  readonly seoDescrCount     = signal(0);
  readonly orderNoteCount    = signal(0);
  readonly techSpecCount     = signal(0);

  onEditorCreated(quill: { getLength(): number }, count: WritableSignal<number>): void {
    count.set(Math.max(0, quill.getLength() - 1));
  }

  onContentChanged(event: ContentChange, count: WritableSignal<number>, limit: number): void {
    const len = event.editor.getLength() - 1;
    if (len > limit) {
      event.editor.deleteText(limit, event.editor.getLength());
      count.set(limit);
    } else {
      count.set(Math.max(0, len));
    }
  }

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

  // ── Options ───────────────────────────────────────────────────────────────
  readonly optionValueSortOrders = Array.from({ length: 50 }, (_, i) => i + 1);
  readonly productOptions = signal<Array<{name: string; values: Array<{optId?: number; val: string; desc: string; color: string; sortOrder: number}>; pendingInput: string; showValues: boolean}>>([]);
  readonly loadingOptions = signal(false);
  readonly savingProductOptions = signal(false);
  readonly saveOptionsMessage = signal<{ text: string; ok: boolean } | null>(null);
  readonly expandedGroupIndex = signal<number | null>(null);
  readonly optionNames = ['SIZE', 'COLOR', 'WIDTH', 'FIT', 'MATERIAL', 'INSEAM', 'STYLE', 'LENGTH'];
  readonly generatedSkusState = signal<{ optionNames: string[]; rows: Array<{ skuCode: string; values: string[]; price: number | null; msrp: number | null; mapPrice: number | null; points: number | null }> } | null>(null);
  readonly creatingGeneratedSkus = signal(false);
  readonly createSkusMessage = signal<{ text: string; ok: boolean } | null>(null);
  readonly skusBannerMessage = signal<{ text: string; ok: boolean } | null>(null);

  // ── Images ────────────────────────────────────────────────────────────────
  readonly images = signal<ProductImage[]>([]);
  readonly loadingImages = signal(false);
  readonly uploadingImage = signal(false);
  readonly sortOrders = Array.from({ length: 50 }, (_, i) => i + 1);
  readonly uploadImageError = signal<string | null>(null);
  readonly imageUrlInput = signal('');
  readonly addingImageUrl = signal(false);

  // ── Categories ────────────────────────────────────────────────────────────
  readonly allCategories = signal<Category[]>([]);
  readonly parentCatIds = computed(() => {
    const s = new Set<number>();
    for (const c of this.allCategories()) {
      if (c.parentCatId != null) s.add(c.parentCatId);
    }
    return s;
  });
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
    if (tab === 'options') { this.loadOptionsTab(); return; }
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

  // ── Options ───────────────────────────────────────────────────────────────

  private async loadOptionsTab(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.loadingOptions.set(true);
    this.expandedGroupIndex.set(null);
    try {
      const opts = await this.optionsService.list(tpId, id);
      const groups = new Map<string, Map<string, { optId?: number; desc: string; color: string; sortOrder: number }>>();
      for (const opt of opts) {
        if (!groups.has(opt.optName)) groups.set(opt.optName, new Map());
        const v = opt.optValue?.trim();
        if (v && !groups.get(opt.optName)!.has(v))
          groups.get(opt.optName)!.set(v, { optId: opt.optId, desc: opt.optDescr ?? v, color: opt.optColor ?? '', sortOrder: opt.sortOrder });
      }
      this.productOptions.set([...groups.entries()].map(([name, valMap]) => ({
        name,
        values: [...valMap.entries()].map(([val, { optId, desc, color, sortOrder }]) => ({ optId, val, desc, color, sortOrder })),
        pendingInput: '',
        showValues: valMap.size > 0,
      })));
    } catch { /* handled inline */ }
    finally { this.loadingOptions.set(false); }
  }

  addOptionGroup(): void {
    this.productOptions.update(list => [...list, { name: '', values: [], pendingInput: '', showValues: false }]);
    this.expandedGroupIndex.set(this.productOptions().length - 1);
  }

  showGroupValues(index: number): void {
    this.productOptions.update(list => list.map((g, i) =>
      i === index
        ? { ...g, showValues: true, values: g.values.length === 0 ? [{ optId: undefined, val: '', desc: '', color: '', sortOrder: 1 }] : g.values }
        : g
    ));
  }

  removeOptionGroup(index: number): void {
    const name = this.productOptions()[index]?.name || 'this option';
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    this.productOptions.update(list => list.filter((_, i) => i !== index));
    if (this.expandedGroupIndex() === index) this.expandedGroupIndex.set(null);
  }

  updateOptionSortOrder(groupIndex: number, valueIndex: number, sortOrder: number): void {
    this.productOptions.update(list => list.map((g, i) =>
      i === groupIndex
        ? { ...g, values: g.values.map((v, vi) => vi === valueIndex ? { ...v, sortOrder } : v) }
        : g
    ));
  }

  updateOptionValue(groupIndex: number, valueIndex: number, field: 'val' | 'desc' | 'color', value: string): void {
    this.productOptions.update(list => list.map((g, i) => {
      if (i !== groupIndex) return g;
      return {
        ...g,
        values: g.values.map((v, vi) => {
          if (vi !== valueIndex) return v;
          const updated = { ...v, [field]: value };
          if (field === 'val' && (v.desc === '' || v.desc === v.val)) updated.desc = value;
          return updated;
        }),
      };
    }));
  }

  addOptionValue(groupIndex: number): void {
    this.productOptions.update(list => list.map((g, i) => {
      if (i !== groupIndex) return g;
      const nextSort = g.values.reduce((max, v) => Math.max(max, v.sortOrder), 0) + 1;
      return { ...g, values: [...g.values, { optId: undefined, val: '', desc: '', color: '', sortOrder: nextSort }] };
    }));
  }

  removeOptionValue(groupIndex: number, valueIndex: number): void {
    this.productOptions.update(list => list.map((g, i) =>
      i === groupIndex ? { ...g, values: g.values.filter((_, vi) => vi !== valueIndex) } : g
    ));
  }

  updateOptionGroupName(index: number, name: string): void {
    this.productOptions.update(list => list.map((g, i) => i === index ? { ...g, name } : g));
  }

  updateOptionGroupInput(index: number, value: string): void {
    this.productOptions.update(list => list.map((g, i) => i === index ? { ...g, pendingInput: value } : g));
  }

  async saveProductOptions(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.savingProductOptions.set(true);
    const options = this.productOptions()
      .filter(g => g.name.trim())
      .flatMap(g => g.values.map(v => ({ optId: v.optId, optName: g.name, optValue: v.val, optDescr: v.desc, optColor: v.color || null, sortOrder: v.sortOrder })));
    this.saveOptionsMessage.set(null);
    try {
      const msg = await this.optionsService.save(tpId, id, options);
      this.saveOptionsMessage.set({ text: msg, ok: true });
      this.expandedGroupIndex.set(null);
      setTimeout(() => this.saveOptionsMessage.set(null), 4000);
    } catch (err) {
      this.saveOptionsMessage.set({ text: err instanceof Error ? err.message : 'Save failed.', ok: false });
    } finally {
      this.savingProductOptions.set(false);
    }
  }

  // ── Generate SKUs ─────────────────────────────────────────────────────────

  generateSkus(): void {
    const groups = this.productOptions()
      .filter(g => g.name.trim() && g.values.some(v => v.val.trim()));
    if (groups.length === 0 && !confirm('No options are set up. Generate a SKU with no option values?')) return;
    const productId = this.product()?.productId ?? '';
    const combos = groups.length === 0
      ? [[]]
      : groups.map(g => g.values.filter(v => v.val.trim()).map(v => v.val.trim()))
          .reduce<string[][]>((acc, vals) => acc.flatMap(c => vals.map(v => [...c, v])), [[]]);
    this.generatedSkusState.set({
      optionNames: groups.map(g => g.name),
      rows: combos.map(combo => ({
        skuCode: [productId, ...combo].filter(Boolean).join('-').toUpperCase(),
        values: combo,
        price: null, msrp: null, mapPrice: null, points: null,
      })),
    });
    this.createSkusMessage.set(null);
  }

  dismissGeneratedSkus(): void {
    this.generatedSkusState.set(null);
    this.createSkusMessage.set(null);
  }

  updateGeneratedSkuField(index: number, field: 'price' | 'msrp' | 'mapPrice' | 'points', value: string): void {
    const state = this.generatedSkusState();
    if (!state) return;
    const parsed = value === '' ? null : parseFloat(value);
    const num = parsed === null || isNaN(parsed) ? null : parsed;
    this.generatedSkusState.set({
      ...state,
      rows: state.rows.map((r, i) => i === index ? { ...r, [field]: num } : r),
    });
  }

  spreadField(field: 'price' | 'msrp' | 'mapPrice' | 'points'): void {
    const state = this.generatedSkusState();
    if (!state || state.rows.length === 0) return;
    const val = state.rows[0][field];
    this.generatedSkusState.set({
      ...state,
      rows: state.rows.map(r => ({ ...r, [field]: val })),
    });
  }

  async createGeneratedSkus(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    const state = this.generatedSkusState();
    if (!tpId || !id || !state) return;
    this.creatingGeneratedSkus.set(true);
    this.createSkusMessage.set(null);
    const base: ProductSkuForm = {
      skuCode: '', upcEan: '', mfrSkuId: '', mfrPartNum: '', sku300: '',
      basePrice: null, compareAtPrc: null, costPerItem: null,
      msrp: null, mapPrice: null, points: null,
      weight: null, weightUnit: 'LB',
      height: null, length: null, width: null, dimensionUnit: 'in',
      countryOfOrig: '', htsCode: '',
      uom: 'EA', hazmatCode: '', restrictedSt: '', erpSkuCode: '',
      requiresShip: 'Y', isTaxable: 'Y',
      invTracker: '', invPolicy: 'deny',
      fulfillSvc: '', variantImgUrl: '', isDefault: 'N',
    };
    let created = 0, failed = 0;
    for (const row of state.rows) {
      try {
        await this.skusService.create(tpId, id, { ...base, skuCode: row.skuCode, basePrice: row.price, msrp: row.msrp, mapPrice: row.mapPrice, points: row.points });
        created++;
      } catch { failed++; }
    }
    this.createSkusMessage.set({
      text: failed === 0
        ? `${created} SKU${created !== 1 ? 's' : ''} created successfully.`
        : `${created} created, ${failed} failed.`,
      ok: failed === 0,
    });
    if (failed === 0) {
      this.generatedSkusState.set(null);
      this.skusBannerMessage.set({ text: `${created} SKU${created !== 1 ? 's' : ''} created successfully.`, ok: true });
      setTimeout(() => this.skusBannerMessage.set(null), 5000);
    }
    this.creatingGeneratedSkus.set(false);
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
    this.loadingImages.set(true);
    try {
      await this.imagesService.updateSortOrder(tpId, productPk, img.imageId, sortOrder);
      this.images.set(await this.imagesService.get(tpId, productPk));
    } catch { /* TODO: surface error */ }
    finally { this.loadingImages.set(false); }
  }

  async addImageByUrl(): Promise<void> {
    const url = this.imageUrlInput().trim();
    if (!url) return;
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.addingImageUrl.set(true);
    this.uploadImageError.set(null);
    try {
      await this.imagesService.add(tpId, id, url, 'large', '', this.images().length);
      this.imageUrlInput.set('');
      this.images.set(await this.imagesService.get(tpId, id));
    } catch (err) {
      this.uploadImageError.set(err instanceof Error ? err.message : 'Failed to add image.');
    } finally {
      this.addingImageUrl.set(false);
    }
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
      const allCats = await this.categoriesService.listAll(tpId);
      this.allCategories.set(allCats);
    } catch { /* handled inline */ }
    try {
      const assigned = await this.service.listProductCategories(tpId, id);
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
    const roots = [...map.values()].filter(c => !c.parentCatId || !map.has(c.parentCatId));
    const result: Array<Category & { level: number }> = [];
    const visit = (catId: number, level: number) => {
      const node = map.get(catId);
      if (!node) return;
      node.level = level;
      result.push(node);
      for (const child of map.values()) {
        if (child.parentCatId === catId) visit(child.catId, level + 1);
      }
    };
    roots.forEach(r => visit(r.catId, 0));
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
