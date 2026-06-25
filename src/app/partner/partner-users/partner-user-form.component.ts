import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { PartnerUsersService } from './partner-users.service';
import { PartnerUser, PartnerUserForm } from './partner-user.model';

@Component({
  selector: 'app-partner-user-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './partner-user-form.component.html',
})
export class PartnerUserFormComponent implements OnInit {
  @ViewChild('userForm') userForm!: NgForm;

  protected readonly partnerMode = inject(PartnerModeService);
  private readonly service = inject(PartnerUsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly showPassword = signal(false);
  readonly emailTouched = signal(false);
  readonly emailError = signal(false);

  isEdit = false;
  userId: number | null = null;

  formData: PartnerUserForm = {
    role: 'USER',
    emailAddress: '',
    phoneNumber: '',
    firstName: '',
    lastName: '',
    status: 'ACTIVE',
    mfaEnabled: 'Y',
    mfaMethod: 'EMAIL',
    password: '',
  };

  private get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

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
    const idParam = this.route.snapshot.paramMap.get('userId');
    if (!idParam) return;

    this.isEdit = true;
    this.userId = Number(idParam);

    const user = (window.history.state as { user?: PartnerUser }).user;
    if (!user || user.userId !== this.userId) {
      this.notFound.set(true);
      return;
    }

    this.formData = {
      role: user.role,
      emailAddress: user.emailAddress?.trim(),
      phoneNumber: user.phoneNumber?.trim() ?? '',
      firstName: user.firstName?.trim() ?? '',
      lastName: user.lastName ?? '',
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      mfaMethod: user.mfaMethod ?? 'EMAIL',
      password: '',
    };
  }

  cancel(): void {
    this.router.navigate(['/partner', this.tpId, 'settings', 'users']);
  }

  private validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async save(): Promise<void> {
    this.emailTouched.set(true);
    this.emailError.set(!this.validateEmail(this.formData.emailAddress));

    if (this.userForm.invalid || this.emailError()) {
      this.userForm.form.markAllAsTouched();
      return;
    }

    const tpId = this.tpId;
    if (!tpId) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.userId != null) {
        await this.service.update(tpId, this.userId, this.formData);
      } else {
        await this.service.create(tpId, this.formData);
      }
      this.router.navigate(['/partner', tpId, 'settings', 'users']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
