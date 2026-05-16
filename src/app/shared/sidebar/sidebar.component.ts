import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly adminOpen = signal(false);

  private router = inject(Router);

  constructor() {
    if (this.router.url.startsWith('/admin/')) {
      this.adminOpen.set(true);
    }

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => {
        if ((e as NavigationEnd).urlAfterRedirects.startsWith('/admin/')) {
          this.adminOpen.set(true);
        }
      });
  }

  toggleAdmin(): void {
    this.adminOpen.update(v => !v);
  }
}
