import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-settings-storefront-images',
  standalone: true,
  templateUrl: './partner-settings-storefront-images.component.html',
})
export class PartnerSettingsStorefrontImagesComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
