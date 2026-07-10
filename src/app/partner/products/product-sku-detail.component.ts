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
  ProductInventory, ProductImage,
} from './product.model';

export type SkuTab = 'details' | 'logistics' | 'inventory' | 'images';

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
  readonly saveSuccess = signal<string | null>(null);

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

  // Inventory
  readonly inventory = signal<ProductInventory[]>([]);
  readonly loadingInventory = signal(false);

  // Images
  readonly images = signal<ProductImage[]>([]);
  readonly loadingImages = signal(false);
  readonly uploadingImage = signal(false);
  readonly sortOrders = Array.from({ length: 50 }, (_, i) => i + 1);
  readonly uploadImageError = signal<string | null>(null);
  readonly imageUrlInput = signal('');
  readonly addingImageUrl = signal(false);

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  ngOnInit(): void {
    const skuParam = this.route.snapshot.paramMap.get('skuId');
    const productParam = this.route.snapshot.paramMap.get('productId');
    this.productId = productParam ? Number(productParam) : null;

    const state = window.history.state as { sku?: ProductSku; product?: Product; justCreated?: boolean };
    this.product = state.product ?? null;

    if (state.justCreated) {
      this.saveSuccess.set('SKU created successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => this.saveSuccess.set(null), 4000);
    }

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
    if (tab === 'inventory' && this.isEdit) this.loadInventory();
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
    this.saveSuccess.set(null);
    try {
      if (this.isEdit && this.skuId != null) {
        await this.service.update(tpId, this.skuId, this.detailsForm);
        this.saveSuccess.set('Saved successfully!');
        setTimeout(() => this.saveSuccess.set(null), 3000);
      } else {
        if (!this.productId) return;
        const created = await this.service.create(tpId, this.productId, this.detailsForm);
        this.isEdit = true;
        this.skuId = created.skuId;
        this.router.navigate(
          ['/partner', tpId, 'products', this.productId, 'skus', created.skuId],
          { replaceUrl: true, state: { sku: created, product: this.product, justCreated: true } }
        );
      }
    } catch (err) {
      this.saveError.set(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      this.saving.set(false);
    }
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

  async addSkuImageByUrl(): Promise<void> {
    const url = this.imageUrlInput().trim();
    if (!url) return;
    const tpId = this.tpId;
    const productId = this.productId;
    const skuId = this.skuId;
    if (!tpId || !productId || !skuId) return;
    this.addingImageUrl.set(true);
    this.uploadImageError.set(null);
    try {
      await this.imagesService.add(tpId, productId, url, 'large', '', this.images().length, skuId);
      this.imageUrlInput.set('');
      this.images.set(await this.imagesService.get(tpId, productId, skuId));
    } catch (err) {
      this.uploadImageError.set(err instanceof Error ? err.message : 'Failed to add image.');
    } finally {
      this.addingImageUrl.set(false);
    }
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
