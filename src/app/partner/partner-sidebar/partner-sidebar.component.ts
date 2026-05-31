import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PartnerModeService } from '../partner-mode.service';

@Component({
  selector: 'app-partner-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './partner-sidebar.component.html',
})
export class PartnerSidebarComponent {
  protected readonly partnerMode = inject(PartnerModeService);
  private readonly router = inject(Router);

  exitPartnerMode(): void {
    this.partnerMode.exit();
    this.router.navigate(['/admin/tenant-partners']);
  }
}
