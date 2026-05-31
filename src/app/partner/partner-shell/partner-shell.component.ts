import { Component, inject, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/header/header.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { PartnerSidebarComponent } from '../partner-sidebar/partner-sidebar.component';
import { SidebarService } from '../../shared/sidebar/sidebar.service';

@Component({
  selector: 'app-partner-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, PartnerSidebarComponent],
  templateUrl: './partner-shell.component.html',
})
export class PartnerShellComponent {
  protected readonly sidebar = inject(SidebarService);

  constructor() {
    const doc = inject(DOCUMENT);
    const platformId = inject(PLATFORM_ID);

    if (isPlatformBrowser(platformId)) {
      this.sidebar.open.set(window.innerWidth >= 992);

      effect(() => {
        doc.body.classList.toggle('sidebar-closed', !this.sidebar.open());
      });
    }
  }
}
