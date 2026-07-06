import { ChangeDetectorRef, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { CategoriesService } from './categories.service';
import { ImageUploadService } from '../../shared/image-upload.service';
import { Category, CategoryForm } from './category.model';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './category-form.component.html',
})
export class CategoryFormComponent implements OnInit {
  @ViewChild('catForm') catFormRef!: NgForm;

  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(CategoriesService);
  private readonly uploadService = inject(ImageUploadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly uploadingImg = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly allCategories = signal<Category[]>([]);

  isEdit = false;
  catId: number | null = null;
  slugAutoSync = true;
  readonly sortOrderOptions = Array.from({ length: 50 }, (_, i) => i + 1);

  formData: CategoryForm = {
    catCode: '', catName: '', catSlug: '', catDescr: '',
    parentCatId: null, imgUrl: '',
    activeFlag: 'Y', sortOrder: 0,
  };

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  onNameChange(value: string): void {
    this.formData.catName = value;
    if (!this.isEdit && this.slugAutoSync) {
      this.formData.catSlug = this.slugify(value);
    }
  }

  onSlugChange(value: string): void {
    this.formData.catSlug = value;
    this.slugAutoSync = false;
  }

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('categoryId');
    if (idParam) {
      this.isEdit = true;
      this.catId = Number(idParam);
      this.slugAutoSync = false;

      const tpId = this.tpId;
      if (tpId) {
        this.loading.set(true);
        try {
          this.prefill(await this.service.get(tpId, this.catId));
          await this.loadCategories();
        } catch {
          this.error.set('Could not load category data.');
        } finally {
          this.loading.set(false);
        }
        return;
      }
    }
    await this.loadCategories();
  }

  private prefill(cat: Category): void {
    this.formData = {
      catCode:      cat.catCode ?? '',
      catName:      cat.catName ?? '',
      catSlug:      cat.catSlug ?? '',
      catDescr:     cat.catDescr ?? '',
      parentCatId:  cat.parentCatId ?? null,
      imgUrl:       cat.imgUrl ?? '',
      activeFlag:   cat.activeFlag ?? 'Y',
      sortOrder:    cat.sortOrder ?? 0,
    };
    this.cdr.markForCheck();
  }

  private async loadCategories(): Promise<void> {
    const tpId = this.tpId;
    if (!tpId) return;
    try {
      const cats = await this.service.listAll(tpId);
      // Exclude self to prevent circular reference
      this.allCategories.set(cats.filter(c => c.catId !== this.catId));
    } catch { /* non-critical */ }
  }

  async onImgSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const tpId = this.tpId;
    if (!tpId) return;
    this.uploadingImg.set(true);
    this.uploadError.set(null);
    try {
      this.formData.imgUrl = await this.uploadService.upload('category_img', file, tpId, { tpId, subfolder: 'categories' });
    } catch (err) {
      this.uploadError.set(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      this.uploadingImg.set(false);
    }
  }

  removeImg(): void {
    this.formData.imgUrl = '';
  }

  cancel(): void {
    this.router.navigate(['/partner', this.tpId, 'products', 'categories']);
  }

  async save(): Promise<void> {
    if (this.catFormRef.invalid) {
      this.catFormRef.form.markAllAsTouched();
      return;
    }
    const tpId = this.tpId;
    if (!tpId) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.catId != null) {
        await this.service.update(tpId, this.catId, this.formData);
      } else {
        await this.service.create(tpId, this.formData);
      }
      this.router.navigate(['/partner', tpId, 'products', 'categories']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }
}
