import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-products',
  standalone: true,
  templateUrl: './partner-products.component.html',
})
export class PartnerProductsComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
