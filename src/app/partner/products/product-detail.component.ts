import { Component, OnInit, inject, signal, computed, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { QuillEditorComponent } from 'ngx-quill';
import type { ContentChange } from 'ngx-quill';
import { PartnerModeService } from '../partner-mode.service';
import { ImageUploadService } from '../../shared/image-upload.service';
import { htmlEncodeNonAscii } from '../../shared/html-encode-non-ascii.util';
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
  ProductOption, ProductImage, ProductAttribute,
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
    clipboard: { matchVisual: false },
    keyboard: {
      bindings: {
        'list autofill': { prefix: /^\s{0,30}(1\.|[-*])\s$/, handler: () => false },
      },
    },
  };

  readonly longDescrCount    = signal(0);
  readonly featuresCount     = signal(0);
  readonly constructionCount = signal(0);
  readonly seoDescrCount     = signal(0);
  readonly orderNoteCount    = signal(0);
  readonly techSpecCount     = signal(0);

  readonly htmlSourceField = signal<string | null>(null);

  toggleHtmlSource(field: string): void {
    this.htmlSourceField.set(this.htmlSourceField() === field ? null : field);
  }

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
    manufacturerId: '', supplierCode: '', gender: '',
  };

  // ── SKUs ──────────────────────────────────────────────────────────────────
  readonly skus = signal<ProductSku[]>([]);
  readonly loadingSkus = signal(false);
  readonly showSkuDeleteModal = signal(false);
  readonly deletingSkus = signal(false);
  readonly skuDeleteTarget = signal<ProductSku | null>(null);

  // ── Options ───────────────────────────────────────────────────────────────
  readonly optionValueSortOrders = Array.from({ length: 50 }, (_, i) => i + 1);
  readonly productOptions = signal<Array<{name: string; values: Array<{optId?: number; val: string; desc: string; color: string; swatchImg: string; sortOrder: number}>; pendingInput: string; showValues: boolean}>>([]);
  readonly uploadingSwatchIdx = signal<string | null>(null);
  readonly loadingOptions = signal(false);
  readonly savingProductOptions = signal(false);
  readonly saveOptionsMessage = signal<{ text: string; ok: boolean } | null>(null);
  readonly expandedGroupIndex = signal<number | null>(null);
  readonly optionNames = ['SIZE', 'COLOR', 'WIDTH', 'FIT', 'MATERIAL', 'INSEAM', 'STYLE', 'LENGTH'];
  readonly generatedSkusState = signal<{ optionNames: string[]; rows: Array<{ skuCode: string; values: string[]; price: number | null; msrp: number | null; mapPrice: number | null; points: number | null }> } | null>(null);
  readonly creatingGeneratedSkus = signal(false);
  readonly createSkusMessage = signal<{ text: string; ok: boolean } | null>(null);
  readonly skusBannerMessage = signal<{ text: string; ok: boolean } | null>(null);

  // ── Images (read-only, aggregated from SKU-level images) ───────────────────
  readonly SHARED_IMAGE_GROUP = '__SHARED__';
  readonly loadingImages = signal(false);
  readonly imageColorGroups = signal<Array<{ value: string; color: string | null; swatchImg: string | null; images: ProductImage[] }>>([]);
  readonly sharedImages = signal<ProductImage[]>([]);
  readonly selectedImageGroup = signal<string | null>(null);
  readonly selectedImageGroupMeta = computed(() => {
    const sel = this.selectedImageGroup();
    if (!sel || sel === this.SHARED_IMAGE_GROUP) return null;
    return this.imageColorGroups().find(g => g.value === sel) ?? null;
  });
  readonly selectedImageGroupImages = computed(() => {
    const sel = this.selectedImageGroup();
    if (sel === this.SHARED_IMAGE_GROUP) return this.sharedImages();
    return this.imageColorGroups().find(g => g.value === sel)?.images ?? [];
  });
  readonly colorsMissingPhotos = computed(() =>
    this.imageColorGroups().filter(g => g.images.length === 0).map(g => g.value)
  );

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
  readonly addingAttr = signal(false);
  readonly attrForm = signal({ attrName: '', attrValue: '' });
  readonly savingAttr = signal(false);
  readonly attrError = signal<string | null>(null);


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
      gender:         p.gender ?? '',
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
    if (tab === 'images') { this.loadImagesTab(); return; }
    const loaded = this.loadedTabs();
    if (!loaded.has(tab)) {
      this.loadedTabs.set(new Set([...loaded, tab]));
      this.loadTabData(tab);
    }
  }

  private loadTabData(tab: ProductTab): void {
    switch (tab) {
      case 'skus':       this.loadSkus(); break;
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
      const payload: ProductForm = {
        ...this.overviewForm,
        longDescr: htmlEncodeNonAscii(this.overviewForm.longDescr),
        features: htmlEncodeNonAscii(this.overviewForm.features),
        construction: htmlEncodeNonAscii(this.overviewForm.construction),
        seoDescr: htmlEncodeNonAscii(this.overviewForm.seoDescr),
        orderNote: htmlEncodeNonAscii(this.overviewForm.orderNote),
        techSpec: htmlEncodeNonAscii(this.overviewForm.techSpec),
      };
      await this.service.update(tpId, id, payload);
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
      const groups = new Map<string, Map<string, { optId?: number; desc: string; color: string; swatchImg: string; sortOrder: number }>>();
      for (const opt of opts) {
        if (!groups.has(opt.optName)) groups.set(opt.optName, new Map());
        const v = opt.optValue?.trim();
        if (v && !groups.get(opt.optName)!.has(v))
          groups.get(opt.optName)!.set(v, { optId: opt.optId, desc: opt.optDescr ?? v, color: opt.optColor ?? '', swatchImg: opt.optSwatchImg ?? '', sortOrder: opt.sortOrder });
      }
      this.productOptions.set([...groups.entries()].map(([name, valMap]) => ({
        name,
        values: [...valMap.entries()].map(([val, { optId, desc, color, swatchImg, sortOrder }]) => ({ optId, val, desc, color, swatchImg, sortOrder })),
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
        ? { ...g, showValues: true, values: g.values.length === 0 ? [{ optId: undefined, val: '', desc: '', color: '', swatchImg: '', sortOrder: 1 }] : g.values }
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

  updateOptionValue(groupIndex: number, valueIndex: number, field: 'val' | 'desc' | 'color' | 'swatchImg', value: string): void {
    this.productOptions.update(list => list.map((g, i) => {
      if (i !== groupIndex) return g;
      return {
        ...g,
        values: g.values.map((v, vi) => {
          if (vi !== valueIndex) return v;
          const updated = { ...v, [field]: value };
          if (field === 'val' && (v.desc === '' || v.desc === v.val)) updated.desc = value;
          if (field === 'color' && value) updated.swatchImg = '';
          if (field === 'swatchImg' && value) updated.color = '';
          return updated;
        }),
      };
    }));
  }

  async uploadSwatchImage(groupIndex: number, valueIndex: number, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.tpId) return;
    const key = `${groupIndex}-${valueIndex}`;
    this.uploadingSwatchIdx.set(key);
    try {
      const url = await this.uploadService.upload('swatch', file, this.tpId, { folder: 'swatches' });
      this.updateOptionValue(groupIndex, valueIndex, 'swatchImg', url);
    } catch { /* silent — user can retry */ }
    finally {
      this.uploadingSwatchIdx.set(null);
      (event.target as HTMLInputElement).value = '';
    }
  }

  addOptionValue(groupIndex: number): void {
    this.productOptions.update(list => list.map((g, i) => {
      if (i !== groupIndex) return g;
      const nextSort = g.values.reduce((max, v) => Math.max(max, v.sortOrder), 0) + 1;
      return { ...g, values: [...g.values, { optId: undefined, val: '', desc: '', color: '', swatchImg: '', sortOrder: nextSort }] };
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
      .flatMap(g => g.values.map(v => ({ optId: v.optId, optName: g.name, optValue: v.val, optDescr: v.desc, optColor: v.color || null, optSwatchImg: v.swatchImg || null, sortOrder: v.sortOrder })));
    this.saveOptionsMessage.set(null);
    try {
      const msg = await this.optionsService.save(tpId, id, options);
      this.saveOptionsMessage.set({ text: msg, ok: true });
      await this.loadOptionsTab();
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
    const optionGroups = this.productOptions();
    let created = 0, failed = 0;
    for (const row of state.rows) {
      const options = row.values.map((val, i) => {
        const group = optionGroups.find(g => g.name === state.optionNames[i]);
        const match = group?.values.find(v => v.val === val);
        return { optId: match?.optId, optName: state.optionNames[i], optValue: val };
      });
      try {
        await this.skusService.create(tpId, id, { ...base, skuCode: row.skuCode, basePrice: row.price, msrp: row.msrp, mapPrice: row.mapPrice, points: row.points, options });
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

  private async loadImagesTab(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    if (!tpId || !id) return;
    this.loadingImages.set(true);
    try {
      const [options, skus, images] = await Promise.all([
        this.optionsService.list(tpId, id),
        this.skusService.list(tpId, id),
        this.imagesService.get(tpId, id),
      ]);
      this.buildImageGroups(options, skus, images);
    } catch { /* handled inline */ }
    finally { this.loadingImages.set(false); }
  }

  private buildImageGroups(options: ProductOption[], skus: ProductSku[], images: ProductImage[]): void {
    const colorMeta = new Map<string, { color: string | null; swatchImg: string | null; sortOrder: number }>();
    for (const o of options) {
      if (o.optName.toUpperCase() !== 'COLOR') continue;
      const v = o.optValue?.trim();
      if (v && !colorMeta.has(v)) {
        colorMeta.set(v, { color: o.optColor ?? null, swatchImg: o.optSwatchImg ?? null, sortOrder: o.sortOrder });
      }
    }

    const skuColor = new Map<number, string>();
    for (const sku of skus) {
      const colorOpt = sku.options?.find(o => o.optName.toUpperCase() === 'COLOR');
      if (colorOpt?.optValue) skuColor.set(sku.skuId, colorOpt.optValue);
    }

    const groups = [...colorMeta.entries()]
      .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
      .map(([value, meta]) => ({ value, color: meta.color, swatchImg: meta.swatchImg, images: [] as ProductImage[] }));
    const groupByValue = new Map(groups.map(g => [g.value, g]));

    const shared: ProductImage[] = [];
    for (const img of images) {
      const color = img.skuId != null ? skuColor.get(img.skuId) : undefined;
      const group = color ? groupByValue.get(color) : undefined;
      (group ? group.images : shared).push(img);
    }
    for (const g of groups) g.images.sort((a, b) => a.sortOrder - b.sortOrder);
    shared.sort((a, b) => a.sortOrder - b.sortOrder);

    this.imageColorGroups.set(groups);
    this.sharedImages.set(shared);

    const firstWithImages = groups.find(g => g.images.length > 0);
    this.selectedImageGroup.set(firstWithImages?.value ?? groups[0]?.value ?? (shared.length ? this.SHARED_IMAGE_GROUP : null));
  }

  selectImageGroup(value: string): void {
    this.selectedImageGroup.set(value);
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
    } catch (err) {
      this.attrError.set(err instanceof Error ? err.message : 'Failed to load attributes.');
    } finally { this.loadingAttributes.set(false); }
  }

  startEditAttr(attr: ProductAttribute | null): void {
    if (attr) {
      this.addingAttr.set(false);
      this.editingAttr.set(attr);
      this.attrForm.set({ attrName: attr.attrName, attrValue: attr.attrValue });
    } else {
      this.editingAttr.set(null);
      this.addingAttr.set(true);
      this.attrForm.set({ attrName: '', attrValue: '' });
    }
  }

  cancelEditAttr(): void {
    this.editingAttr.set(null);
    this.addingAttr.set(false);
  }

  async saveAttr(): Promise<void> {
    const tpId = this.tpId;
    const id = this.productPk();
    const form = this.attrForm();
    if (!tpId || !id || !form.attrName.trim() || !form.attrValue.trim()) return;
    this.savingAttr.set(true);
    this.attrError.set(null);
    try {
      const existing = this.editingAttr();
      if (existing) {
        await this.service.updateAttribute(tpId, existing.attrId, form);
        this.attributes.update(list =>
          list.map(a => a.attrId === existing.attrId ? { ...a, ...form } : a)
        );
      } else {
        await this.service.addAttribute(tpId, { productPk: id, ...form });
      }
      this.editingAttr.set(null);
      await this.loadAttributes();
      this.addingAttr.set(false);
    } catch (err) {
      this.attrError.set(err instanceof Error ? err.message : 'Failed to save attribute.');
    } finally { this.savingAttr.set(false); }
  }

  async deleteAttr(attr: ProductAttribute): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    this.attrError.set(null);
    try {
      await this.service.deleteAttribute(tpId, attr.attrId);
      this.attributes.update(list => list.filter(a => a.attrId !== attr.attrId));
    } catch (err) {
      this.attrError.set(err instanceof Error ? err.message : 'Failed to delete attribute.');
    }
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
