import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformAdminsService } from './platform-admins.service';
import { PlatformAdminForm } from './platform-admin.model';

@Component({
  selector: 'app-platform-admin-new',
  templateUrl: './platform-admin-new.component.html',
  standalone: false,
})
export class PlatformAdminNewComponent {
  private readonly service = inject(PlatformAdminsService);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  formData: PlatformAdminForm = {
    username: '',
    emailAddress: '',
    phoneNumber: '',
    firstName: '',
    lastName: '',
    status: 'ACTIVE',
    mfaEnabled: 'Y',
    mfaMethod: 'EMAIL',
    password: '',
  };

  cancel(): void {
    this.router.navigate(['/admin/platform-admins']);
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.service.create(this.formData);
      this.router.navigate(['/admin/platform-admins']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
