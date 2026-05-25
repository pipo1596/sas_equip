import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantPartnersService } from './tenant-partners.service';
import { TenantPartner, TenantPartnerForm } from './tenant-partner.model';

@Component({
  selector: 'app-tenant-partner-form',
  templateUrl: './tenant-partner-form.component.html',
  standalone: false,
})
export class TenantPartnerFormComponent implements OnInit {
  @ViewChild('partnerForm') partnerForm!: NgForm;

  private readonly service = inject(TenantPartnersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly emailTouched = signal(false);
  readonly emailError = signal(false);

  isEdit = false;
  tpId: number | null = null;

  formData: TenantPartnerForm = {
    tpName: '',
    tpStatus: 'ACTIVE',
    loginDomain: '',
    portalBaseDomain: '',
    mfaRequired: 'Y',
    adminContactEmail: '',
    adminContactPhone: '',
  };

  formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length > 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length > 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    if (digits.length > 0) {
      return `(${digits}`;
    }
    return '';
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;

    this.isEdit = true;
    this.tpId = Number(idParam);

    const partner = (window.history.state as { partner?: TenantPartner }).partner;
    if (!partner || partner.tpId !== this.tpId) {
      this.notFound.set(true);
      return;
    }

    this.formData = {
      tpName: partner.tpName,
      tpStatus: partner.tpStatus,
      loginDomain: partner.loginDomain ?? '',
      portalBaseDomain: partner.portalBaseDomain ?? '',
      mfaRequired: partner.mfaRequired,
      adminContactEmail: partner.adminContactEmail ?? '',
      adminContactPhone: partner.adminContactPhone ?? '',
    };
  }

  cancel(): void {
    this.router.navigate(['/admin/tenant-partners']);
  }

  private validateEmail(email: string): boolean {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async save(): Promise<void> {
    this.emailTouched.set(true);
    this.emailError.set(!this.validateEmail(this.formData.adminContactEmail));

    if (this.partnerForm.invalid || this.emailError()) {
      this.partnerForm.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.tpId != null) {
        await this.service.update(this.tpId, this.formData);
      } else {
        await this.service.create(this.formData);
      }
      this.router.navigate(['/admin/tenant-partners']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
