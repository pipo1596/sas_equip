import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-employees',
  standalone: true,
  templateUrl: './partner-employees.component.html',
})
export class PartnerEmployeesComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
