import { Routes } from '@angular/router';

// All routes are relative to partner/:id/settings
export const SETTINGS_ROUTES: Routes = [
  { path: '', redirectTo: 'identity', pathMatch: 'full' },

  // ── Users ──────────────────────────────────────────────────────────────────
  {
    path: 'users',
    loadComponent: () => import('../partner-users/partner-users.component').then(m => m.PartnerUsersComponent),
  },
  {
    path: 'users/new',
    loadComponent: () => import('../partner-users/partner-user-form.component').then(m => m.PartnerUserFormComponent),
  },
  {
    path: 'users/:userId/edit',
    loadComponent: () => import('../partner-users/partner-user-form.component').then(m => m.PartnerUserFormComponent),
  },

  // ── Settings pages ─────────────────────────────────────────────────────────
  {
    path: 'identity',
    loadComponent: () => import('./partner-settings-identity.component').then(m => m.PartnerSettingsIdentityComponent),
  },
  {
    path: 'organization',
    loadComponent: () => import('./partner-settings-organization.component').then(m => m.PartnerSettingsOrganizationComponent),
  },
  {
    path: 'branding',
    loadComponent: () => import('./partner-settings-branding.component').then(m => m.PartnerSettingsBrandingComponent),
  },
  {
    path: 'social',
    loadComponent: () => import('./partner-settings-social.component').then(m => m.PartnerSettingsSocialComponent),
  },
  {
    path: 'storefront-copy',
    loadComponent: () => import('./partner-settings-storefront-copy.component').then(m => m.PartnerSettingsStorefrontCopyComponent),
  },
  {
    path: 'legal',
    loadComponent: () => import('./partner-settings-legal.component').then(m => m.PartnerSettingsLegalComponent),
  },
  {
    path: 'address',
    loadComponent: () => import('./partner-settings-address.component').then(m => m.PartnerSettingsAddressComponent),
  },
  {
    path: 'contacts',
    loadComponent: () => import('./partner-settings-contacts.component').then(m => m.PartnerSettingsContactsComponent),
  },
  {
    path: 'mfa',
    loadComponent: () => import('./partner-settings-mfa.component').then(m => m.PartnerSettingsMfaComponent),
  },
];
