import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, CanMatch, Router, UrlTree } from '@angular/router';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanMatch, CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private check(): boolean | UrlTree {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    return this.auth.isAuthenticated() ? this.router.parseUrl('/dashboard') : true;
  }

  canMatch(): boolean | UrlTree { return this.check(); }
  canActivate(): boolean | UrlTree { return this.check(); }
}
