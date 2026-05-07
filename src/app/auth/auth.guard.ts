import { Injectable } from '@angular/core';
import { CanActivate, CanMatch, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanMatch, CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  private redirectToLogin(): UrlTree {
    return this.router.parseUrl('/login');
  }

  canMatch(): boolean | UrlTree {
    return this.auth.isAuthenticated() ? true : this.redirectToLogin();
  }

  canActivate(): boolean | UrlTree {
    return this.auth.isAuthenticated() ? true : this.redirectToLogin();
  }
}
