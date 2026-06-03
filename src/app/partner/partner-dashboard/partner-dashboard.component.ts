import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-dashboard',
  standalone: true,
  templateUrl: './partner-dashboard.component.html',
})
export class PartnerDashboardComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
