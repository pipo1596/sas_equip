import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-settings-address',
  standalone: true,
  templateUrl: './partner-settings-address.component.html',
})
export class PartnerSettingsAddressComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
