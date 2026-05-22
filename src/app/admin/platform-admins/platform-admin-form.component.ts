import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlatformAdminsService } from './platform-admins.service';
import { PlatformAdmin, PlatformAdminForm } from './platform-admin.model';

@Component({
  selector: 'app-platform-admin-form',
  templateUrl: './platform-admin-form.component.html',
  standalone: false,
})
export class PlatformAdminFormComponent implements OnInit {
  @ViewChild('adminForm') adminForm!: NgForm;

  private readonly service = inject(PlatformAdminsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly showPassword = signal(false);
  readonly emailTouched = signal(false);
  readonly emailError = signal(false);

  isEdit = false;
  padminId: number | null = null;

  formData: PlatformAdminForm = {
    role: 'ADMIN',
    emailAddress: '',
    phoneNumber: '',
    firstName: '',
    lastName: '',
    status: 'ACTIVE',
    mfaEnabled: 'Y',
    mfaMethod: 'SMS',
    password: '',
  };

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

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
    this.padminId = Number(idParam);

    const admin = (window.history.state as { admin?: PlatformAdmin }).admin;
    if (!admin || admin.padminId !== this.padminId) {
      this.notFound.set(true);
      return;
    }

    this.formData = {
      role: admin.role,
      emailAddress: admin.emailAddress?.trim(),
      phoneNumber: admin.phoneNumber?.trim() ?? '',
      firstName: admin.firstName?.trim() ?? '',
      lastName: admin.lastName ?? '',
      status: admin.status,
      mfaEnabled: admin.mfaEnabled,
      mfaMethod: admin.mfaMethod ?? 'EMAIL',
      password: '',
    };
  }

  cancel(): void {
    this.router.navigate(['/admin/platform-admins']);
  }

  private validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async save(): Promise<void> {
    this.emailTouched.set(true);
    this.emailError.set(!this.validateEmail(this.formData.emailAddress));

    if (this.adminForm.invalid || this.emailError()) {
      this.adminForm.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.padminId != null) {
        await this.service.update(this.padminId, this.formData);
      } else {
        await this.service.create(this.formData);
      }
      this.router.navigate(['/admin/platform-admins']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
