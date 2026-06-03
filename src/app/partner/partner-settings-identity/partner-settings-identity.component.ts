import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-settings-identity',
  standalone: true,
  templateUrl: './partner-settings-identity.component.html',
})
export class PartnerSettingsIdentityComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
