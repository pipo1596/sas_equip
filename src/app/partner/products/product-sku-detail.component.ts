import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { PartnerModeService } from '../partner-mode.service';
import { ProductSkusService } from './product-skus.service';
import { ProductImagesService } from './product-images.service';
import { ImageUploadService } from '../../shared/image-upload.service';
import {
  ProductSku, ProductSkuForm, Product,
  ProductInventory, ProductPricing, ProductImage,
} from './product.model';

export type SkuTab = 'details' | 'options' | 'pricing' | 'logistics' | 'inventory' | 'images';

@Component({
  selector: 'app-product-sku-detail',
  standalone: true,
  imports: [FormsModule, RouterModule, DecimalPipe],
  templateUrl: './product-sku-detail.component.html',
})
export class ProductSkuDetailComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(ProductSkusService);
  private readonly imagesService = inject(ProductImagesService);
  private readonly uploadService = inject(ImageUploadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly activeTab = signal<SkuTab>('details');
  readonly loadedTabs = signal<Set<SkuTab>>(new Set(['details']));

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  // Parent product context
  product: Product | null = null;
  productId: number | null = null;

  // SKU identity
  isEdit = false;
  skuId: number | null = null;

  // Details form (all fields)
  detailsForm: ProductSkuForm = {
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

  // Options (inline grid)
  readonly options = signal<Array<{ optName: string; optValue: string; sortOrder: number }>>([]);
  readonly savingOptions = signal(false);
  readonly optionNames = ['SIZE', 'COLOR', 'WIDTH', 'FIT', 'MATERIAL', 'INSEAM', 'STYLE', 'LENGTH'];

  // Inventory
  readonly inventory = signal<ProductInventory[]>([]);
  readonly loadingInventory = signal(false);

  // Pricing
  readonly pricing = signal<ProductPricing[]>([]);
  readonly loadingPricing = signal(false);
  readonly pricingForm = signal({ currencyCd: 'USD', priceAmount: 0, compareAmount: null as number | null, isActive: 'Y' as 'Y' | 'N' });
  readonly savingPricing = signal(false);

  // Images
  readonly images = signal<ProductImage[]>([]);
  readonly loadingImages = signal(false);
  readonly uploadingImage = signal(false);
  readonly sortOrders = Array.from({ length: 50 }, (_, i) => i + 1);
  readonly uploadImageError = signal<string | null>(null);

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  ngOnInit(): void {
    const skuParam = this.route.snapshot.paramMap.get('skuId');
    const productParam = this.route.snapshot.paramMap.get('productId');
    this.productId = productParam ? Number(productParam) : null;

    const state = window.history.state as { sku?: ProductSku; product?: Product };
    this.product = state.product ?? null;

    if (skuParam && skuParam !== 'new') {
      this.isEdit = true;
      this.skuId = Number(skuParam);
      this.fetchSku();
    }
  }

  private async fetchSku(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId || !this.skuId) return;
    this.loading.set(true);
    try {
      const sku = await this.service.get(tpId, this.skuId);
      this.syncDetailsForm(sku);
      if (sku.options) {
        this.options.set(sku.options.map(o => ({
          optName: o.optName, optValue: o.optValue, sortOrder: o.sortOrder,
        })));
      }
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Failed to load SKU.');
    } finally {
      this.loading.set(false);
    }
  }

  private syncDetailsForm(sku: ProductSku): void {
    this.detailsForm = {
      skuCode:       sku.skuCode ?? '',
      upcEan:        sku.upcEan ?? '',
      mfrSkuId:      sku.mfrSkuId ?? '',
      mfrPartNum:    sku.mfrPartNum ?? '',
      sku300:        sku.sku300 ?? '',
      basePrice:     sku.basePrice,
      compareAtPrc:  sku.compareAtPrc,
      costPerItem:   sku.costPerItem,
      msrp:          sku.msrp,
      mapPrice:      sku.mapPrice,
      points:        sku.points,
      weight:        sku.weight,
      weightUnit:    sku.weightUnit ?? 'LB',
      height:        sku.height,
      length:        sku.length,
      width:         sku.width,
      dimensionUnit: sku.dimensionUnit ?? 'in',
      countryOfOrig: sku.countryOfOrig ?? '',
      htsCode:       sku.htsCode ?? '',
      uom:           sku.uom ?? 'EA',
      hazmatCode:    sku.hazmatCode ?? '',
      restrictedSt:  sku.restrictedSt ?? '',
      erpSkuCode:    sku.erpSkuCode ?? '',
      requiresShip:  sku.requiresShip,
      isTaxable:     sku.isTaxable,
      invTracker:    sku.invTracker ?? '',
      invPolicy:     sku.invPolicy ?? 'deny',
      fulfillSvc:    sku.fulfillSvc ?? '',
      variantImgUrl: sku.variantImgUrl ?? '',
      isDefault:     sku.isDefault,
    };
  }

  setTab(tab: SkuTab): void {
    this.activeTab.set(tab);
    if (tab === 'images') { this.loadImages(); return; }
    const loaded = this.loadedTabs();
    if (!loaded.has(tab)) {
      this.loadedTabs.set(new Set([...loaded, tab]));
      this.loadTabData(tab);
    }
  }

  private loadTabData(tab: SkuTab): void {
    if (tab === 'options' && this.isEdit) this.loadOptions();
    if (tab === 'inventory' && this.isEdit) this.loadInventory();
    if (tab === 'pricing' && this.isEdit) this.loadPricing();
  }

  // ── Details save ──────────────────────────────────────────────────────────

  async save(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    if (!this.detailsForm.skuCode?.trim()) {
      this.saveError.set('SKU Code is required.');
      return;
    }
    if (this.detailsForm.basePrice == null) {
      this.saveError.set('Price is required.');
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      if (this.isEdit && this.skuId != null) {
        await this.service.update(tpId, this.skuId, this.detailsForm);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      } else {
        if (!this.productId) return;
        const created = await this.service.create(tpId, this.productId, this.detailsForm);
        this.isEdit = true;
        this.skuId = created.skuId;
        this.saveSuccess.set(true);
        this.router.navigate(
          ['/partner', tpId, 'products', this.productId, 'skus', created.skuId],
          { replaceUrl: true, state: { sku: created, product: this.product } }
        );
      }
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }

  // ── Options (inline grid) ─────────────────────────────────────────────────

  private async loadOptions(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId || !this.skuId) return;
    try {
      const opts = await this.service.listOptions(tpId, this.skuId);
      this.options.set(opts.map(o => ({ optName: o.optName, optValue: o.optValue, sortOrder: o.sortOrder })));
    } catch { /* non-critical */ }
  }

  addOption(): void {
    this.options.update(list => [...list, { optName: 'SIZE', optValue: '', sortOrder: list.length }]);
  }

  removeOption(index: number): void {
    this.options.update(list => list.filter((_, i) => i !== index));
  }

  async saveOptions(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId || !this.skuId) return;
    this.savingOptions.set(true);
    try {
      await this.service.saveOptions(tpId, this.skuId, this.options());
    } catch { /* TODO: surface error */ }
    finally { this.savingOptions.set(false); }
  }

  // ── Inventory ─────────────────────────────────────────────────────────────

  private async loadInventory(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId || !this.skuId) return;
    this.loadingInventory.set(true);
    try {
      this.inventory.set(await this.service.listInventory(tpId, this.skuId));
    } catch { /* handled inline */ }
    finally { this.loadingInventory.set(false); }
  }

  async updateInventoryQty(inv: ProductInventory, qty: number): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    try {
      await this.service.updateInventory(tpId, inv.invId, { qtyOnHand: qty });
      this.inventory.update(list =>
        list.map(i => i.invId === inv.invId ? { ...i, qtyOnHand: qty, qtyAvailable: qty - i.qtyReserved } : i)
      );
    } catch { /* TODO: surface error */ }
  }

  // ── Pricing ───────────────────────────────────────────────────────────────

  private async loadPricing(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId || !this.skuId) return;
    this.loadingPricing.set(true);
    try {
      this.pricing.set(await this.service.listPricing(tpId, this.skuId));
    } catch { /* handled inline */ }
    finally { this.loadingPricing.set(false); }
  }

  async addPricingRow(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId || !this.skuId) return;
    const form = this.pricingForm();
    this.savingPricing.set(true);
    try {
      const created = await this.service.addPricing(tpId, {
        skuId: this.skuId,
        channelId: null, marketId: null,
        currencyCd: form.currencyCd,
        priceAmount: form.priceAmount,
        compareAmount: form.compareAmount,
        effectiveFrom: null, effectiveTo: null,
        isActive: form.isActive,
      });
      this.pricing.update(list => [...list, created]);
      this.pricingForm.set({ currencyCd: 'USD', priceAmount: 0, compareAmount: null, isActive: 'Y' });
    } catch { /* TODO: surface error */ }
    finally { this.savingPricing.set(false); }
  }

  async deletePricingRow(p: ProductPricing): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    try {
      await this.service.deletePricing(tpId, p.priceId);
      this.pricing.update(list => list.filter(r => r.priceId !== p.priceId));
    } catch { /* TODO: surface error */ }
  }

  // ── Images ────────────────────────────────────────────────────────────────

  private async loadImages(): Promise<void> {
    const tpId = this.tpId;
    const productId = this.productId;
    const skuId = this.skuId;
    if (!tpId || !productId || !skuId) return;
    this.loadingImages.set(true);
    try {
      this.images.set(await this.imagesService.get(tpId, productId, skuId));
    } catch { /* handled inline */ }
    finally { this.loadingImages.set(false); }
  }

  async onImageFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const tpId = this.tpId;
    const productId = this.productId;
    const skuId = this.skuId;
    if (!tpId || !productId || !skuId) return;
    this.uploadingImage.set(true);
    this.uploadImageError.set(null);
    try {
      const imgUrl = await this.uploadService.upload('product_image', file, tpId, { tpId, productPk: productId, skuId, subfolder: 'products' });
      await this.imagesService.add(tpId, productId, imgUrl, 'large', '', this.images().length, skuId);
      this.images.set(await this.imagesService.get(tpId, productId, skuId));
    } catch (err) {
      this.uploadImageError.set(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      this.uploadingImage.set(false);
      (event.target as HTMLInputElement).value = '';
    }
  }

  async setSkuImageSortOrder(img: ProductImage, sortOrder: number): Promise<void> {
    const tpId = this.tpId;
    const productId = this.productId;
    const skuId = this.skuId;
    if (!tpId || !productId || !skuId) return;
    this.loadingImages.set(true);
    try {
      await this.imagesService.updateSortOrder(tpId, productId, img.imageId, sortOrder);
      this.images.set(await this.imagesService.get(tpId, productId, skuId));
    } catch { /* TODO: surface error */ }
    finally { this.loadingImages.set(false); }
  }

  async deleteSkuImage(img: ProductImage): Promise<void> {
    if (!confirm('Delete this image? This cannot be undone.')) return;
    const tpId = this.tpId;
    const productId = this.productId;
    const skuId = this.skuId;
    if (!tpId || !productId || !skuId) return;
    try {
      await this.imagesService.remove(tpId, productId, img.imageId);
      this.images.update(list => list.filter(i => i.imageId !== img.imageId));
    } catch { /* TODO: surface error */ }
  }

  backToProduct(): void {
    this.router.navigate(['/partner', this.tpId, 'products', this.productId], {
      state: { tab: 'skus' },
    });
  }
}
