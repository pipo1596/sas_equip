import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { CategoriesService } from './categories.service';
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly allCategories = signal<Category[]>([]);

  isEdit = false;
  catId: number | null = null;

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
    if (!this.isEdit && !this.formData.catSlug) {
      this.formData.catSlug = this.slugify(value);
    }
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('categoryId');
    if (idParam) {
      this.isEdit = true;
      this.catId = Number(idParam);
      const cat = (window.history.state as { category?: Category }).category;
      if (cat && cat.catId === this.catId) {
        this.formData = {
          catCode: cat.catCode ?? '',
          catName: cat.catName ?? '',
          catSlug: cat.catSlug ?? '',
          catDescr: cat.catDescr ?? '',
          parentCatId: cat.parentCatId ?? null,
          imgUrl: cat.imgUrl ?? '',
          activeFlag: cat.activeFlag ?? 'Y',
          sortOrder: cat.sortOrder ?? 0,
        };
      }
    }
    this.loadCategories();
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
