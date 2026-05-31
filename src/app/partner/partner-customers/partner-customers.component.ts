import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-customers',
  standalone: true,
  templateUrl: './partner-customers.component.html',
})
export class PartnerCustomersComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
