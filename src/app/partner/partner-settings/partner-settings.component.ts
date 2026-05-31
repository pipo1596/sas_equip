import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-settings',
  standalone: true,
  templateUrl: './partner-settings.component.html',
})
export class PartnerSettingsComponent {
  protected readonly partnerMode = inject(PartnerModeService);
  protected readonly route = inject(ActivatedRoute);
}
