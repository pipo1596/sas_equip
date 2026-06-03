import { Component, inject } from '@angular/core';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-settings-record-metadata',
  standalone: true,
  templateUrl: './partner-settings-record-metadata.component.html',
})
export class PartnerSettingsRecordMetadataComponent {
  protected readonly partnerMode = inject(PartnerModeService);
}
