import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-settings-storefront-fields',
  standalone: true,
  templateUrl: './partner-settings-storefront-fields.component.html',
})
export class PartnerSettingsStorefrontFieldsComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
