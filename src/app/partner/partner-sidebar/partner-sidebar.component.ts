import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
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

  readonly inSettingsMode = signal(this.checkSettingsMode());

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.inSettingsMode.set(this.checkSettingsMode()));
  }

  private checkSettingsMode(): boolean {
    return this.router.url.includes('/settings/') || this.router.url.endsWith('/settings');
  }

  exitSettingsMode(): void {
    const partner = this.partnerMode.activePartner();
    if (partner) {
      this.router.navigate(['/partner', partner.tpId, 'dashboard']);
    }
  }

  exitPartnerMode(): void {
    this.partnerMode.exit();
    this.router.navigate(['/admin/tenant-partners']);
  }
}
