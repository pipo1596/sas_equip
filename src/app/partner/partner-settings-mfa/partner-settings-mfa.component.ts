import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-settings-mfa',
  standalone: true,
  templateUrl: './partner-settings-mfa.component.html',
})
export class PartnerSettingsMfaComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
