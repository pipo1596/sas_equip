import { Component, ElementRef, HostListener, ViewChild, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { SidebarService } from '../sidebar/sidebar.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  @ViewChild('userDropdown') userDropdownEl!: ElementRef<HTMLElement>;

  userMenuOpen = signal(false);

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
