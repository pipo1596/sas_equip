import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { ShellComponent } from './shell/shell.component';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent) },
  { path: 'mfa', loadComponent: () => import('./auth/mfa/mfa.component').then((m) => m.MfaComponent) },
  {
    path: '',
    component: ShellComponent,
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
      },
      {
        path: 'reports',
        loadChildren: () => import('./reports/reports.module').then((m) => m.ReportsModule),
      },
      {
        path: 'settings',
        loadChildren: () => import('./settings/settings.module').then((m) => m.SettingsModule),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
