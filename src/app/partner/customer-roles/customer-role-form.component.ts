import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';
import { CustomerRolesService } from './customer-roles.service';
import { CustomerRole, CustomerRoleForm } from './customer-role.model';

@Component({
  selector: 'app-customer-role-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './customer-role-form.component.html',
})
export class CustomerRoleFormComponent implements OnInit {
  @ViewChild('roleForm') roleFormRef!: NgForm;

  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly service = inject(CustomerRolesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  isEdit = false;
  roleId: number | null = null;
  customerId: number | null = null;

  formData: CustomerRoleForm = {
    roleName: '',
    accessLevel: 'EMPLOYEE',
    allotmentType: 'NONE',
    description: '',
    isActive: 'Y',
  };

  protected get tpId(): number | undefined {
    return this.partnerMode.activePartner()?.tpId;
  }

  async ngOnInit(): Promise<void> {
    this.customerId = Number(this.route.snapshot.paramMap.get('customerId'));

    const tpId = this.tpId;
    if (tpId && this.customerId) await this.customerMode.ensure(tpId, this.customerId);

    const idParam = this.route.snapshot.paramMap.get('roleId');
    if (!idParam) return;

    this.isEdit = true;
    this.roleId = Number(idParam);

    if (!tpId || !this.customerId) return;
    this.loading.set(true);
    try {
      this.prefill(await this.service.get(tpId, this.customerId, this.roleId));
    } catch {
      this.error.set('Could not load role data.');
    } finally {
      this.loading.set(false);
    }
  }

  private prefill(role: CustomerRole): void {
    this.formData = {
      roleName:      role.roleName ?? '',
      accessLevel:   role.accessLevel ?? 'EMPLOYEE',
      allotmentType: role.allotmentType ?? 'NONE',
      description:   role.description ?? '',
      isActive:      role.isActive ?? 'Y',
    };
  }

  cancel(): void {
    this.router.navigate(['/partner', this.tpId, 'customers', this.customerId, 'roles']);
  }

  async save(): Promise<void> {
    if (this.roleFormRef.invalid) {
      this.roleFormRef.form.markAllAsTouched();
      return;
    }
    const tpId = this.tpId;
    if (!tpId || !this.customerId) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      if (this.isEdit && this.roleId != null) {
        await this.service.update(tpId, this.customerId, this.roleId, this.formData);
      } else {
        await this.service.create(tpId, this.customerId, this.formData);
      }
      this.router.navigate(['/partner', tpId, 'customers', this.customerId, 'roles']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }
}
