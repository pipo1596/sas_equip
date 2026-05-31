import { Component, ElementRef, HostListener, ViewChild, signal, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { SidebarService } from '../sidebar/sidebar.service';
import { PartnerModeService } from '../../partner/partner-mode.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  @ViewChild('userDropdown') userDropdownEl!: ElementRef<HTMLElement>;

  userMenuOpen = signal(false);
  readonly partnerMode = inject(PartnerModeService);

  get displayName() {
    return this.auth.displayName;
  }

  get initials() {
    return this.auth.initials;
  }

  constructor(
    private auth: AuthService,
    private router: Router,
    readonly sidebar: SidebarService,
  ) {}

  toggleUserMenu() {
    this.userMenuOpen.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  closeMenus(event: Event) {
    if (this.userDropdownEl && !this.userDropdownEl.nativeElement.contains(event.target as Node)) {
      this.userMenuOpen.set(false);
    }
  }

  async logout() {
    this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
