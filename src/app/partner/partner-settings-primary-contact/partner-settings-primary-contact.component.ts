import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-settings-primary-contact',
  standalone: true,
  templateUrl: './partner-settings-primary-contact.component.html',
})
export class PartnerSettingsPrimaryContactComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
