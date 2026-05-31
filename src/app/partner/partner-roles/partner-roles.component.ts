import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-roles',
  standalone: true,
  templateUrl: './partner-roles.component.html',
})
export class PartnerRolesComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
