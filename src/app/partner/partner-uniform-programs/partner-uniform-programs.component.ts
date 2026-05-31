import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-uniform-programs',
  standalone: true,
  templateUrl: './partner-uniform-programs.component.html',
})
export class PartnerUniformProgramsComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
