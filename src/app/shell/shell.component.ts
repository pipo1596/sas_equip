import { Component, inject, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../shared/header/header.component';
import { FooterComponent } from '../shared/footer/footer.component';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { SidebarService } from '../shared/sidebar/sidebar.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, SidebarComponent],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  constructor() {
    const sidebar = inject(SidebarService);
    const doc = inject(DOCUMENT);
    const platformId = inject(PLATFORM_ID);

    if (isPlatformBrowser(platformId)) {
      effect(() => {
        doc.body.classList.toggle('sidebar-closed', !sidebar.open());
      });
    }
  }
}
