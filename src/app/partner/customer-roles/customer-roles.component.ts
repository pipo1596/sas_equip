import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';
import { CustomerModeService } from '../partner-customers/customer-mode.service';

@Component({
  selector: 'app-partner-roles',
  standalone: true,
  templateUrl: './partner-roles.component.html',
})
export class PartnerRolesComponent implements OnInit {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly customerMode = inject(CustomerModeService);
  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    const tpId = this.partnerMode.activePartner()?.tpId;
    const customerId = Number(this.route.snapshot.paramMap.get('customerId'));
    if (!tpId || !customerId) return;
    await this.customerMode.ensure(tpId, customerId);
  }
}
