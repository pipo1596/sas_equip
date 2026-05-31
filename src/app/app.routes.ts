import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { GuestGuard } from './auth/guest.guard';
import { ShellComponent } from './shell/shell.component';
import { PartnerShellComponent } from './partner/partner-shell/partner-shell.component';
import { partnerModeGuard } from './partner/partner-mode.guard';

export const routes: Routes = [
  { path: 'login', canMatch: [GuestGuard], canActivate: [GuestGuard], loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent) },
  { path: 'mfa', canMatch: [GuestGuard], canActivate: [GuestGuard], loadComponent: () => import('./auth/mfa/mfa.component').then((m) => m.MfaComponent) },
  {
    path: 'partner',
    component: PartnerShellComponent,
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    loadChildren: () => import('./partner/partner.module').then((m) => m.PartnerModule),
  },
  {
    path: '',
    component: ShellComponent,
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    canActivateChild: [partnerModeGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'reports',
        loadChildren: () => import('./reports/reports.module').then((m) => m.ReportsModule),
      },
      {
        path: 'settings',
        loadChildren: () => import('./settings/settings.module').then((m) => m.SettingsModule),
      },
      {
        path: 'admin',
        loadChildren: () => import('./admin/admin.module').then((m) => m.AdminModule),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
