import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlatformAdminsService } from './platform-admins.service';
import { PlatformAdmin, PlatformAdminForm } from './platform-admin.model';

@Component({
  selector: 'app-platform-admin-edit',
  templateUrl: './platform-admin-edit.component.html',
  standalone: false,
})
export class PlatformAdminEditComponent implements OnInit {
  private readonly service = inject(PlatformAdminsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);

  padminId!: number;

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

  ngOnInit(): void {
    this.padminId = Number(this.route.snapshot.paramMap.get('id'));

    const admin = (window.history.state as { admin?: PlatformAdmin }).admin;
    if (!admin || admin.padminId !== this.padminId) {
      this.notFound.set(true);
      return;
    }

    this.formData = {
      username: admin.username,
      emailAddress: admin.emailAddress,
      phoneNumber: admin.phoneNumber ?? '',
      firstName: admin.firstName ?? '',
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

  async save(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.service.update(this.padminId, this.formData);
      this.router.navigate(['/admin/platform-admins']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
