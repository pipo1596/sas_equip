import { Routes } from '@angular/router';
import { PartnerUsersComponent } from '../partner-users/partner-users.component';
import { PartnerUserFormComponent } from '../partner-users/partner-user-form.component';
import { PartnerSettingsIdentityComponent } from './partner-settings-identity.component';
import { PartnerSettingsOrganizationComponent } from './partner-settings-organization.component';
import { PartnerSettingsBrandingComponent } from './partner-settings-branding.component';
import { PartnerSettingsSocialComponent } from './partner-settings-social.component';
import { PartnerSettingsStorefrontCopyComponent } from './partner-settings-storefront-copy.component';
import { PartnerSettingsLegalComponent } from './partner-settings-legal.component';
import { PartnerSettingsAddressComponent } from './partner-settings-address.component';
import { PartnerSettingsContactsComponent } from './partner-settings-contacts.component';
import { PartnerSettingsMfaComponent } from './partner-settings-mfa.component';

// All routes are relative to partner/:id/settings
export const SETTINGS_ROUTES: Routes = [
  { path: '', redirectTo: 'identity', pathMatch: 'full' },
  { path: 'users', component: PartnerUsersComponent },
  { path: 'users/new', component: PartnerUserFormComponent },
  { path: 'users/:userId/edit', component: PartnerUserFormComponent },
  { path: 'identity', component: PartnerSettingsIdentityComponent },
  { path: 'organization', component: PartnerSettingsOrganizationComponent },
  { path: 'branding', component: PartnerSettingsBrandingComponent },
  { path: 'social', component: PartnerSettingsSocialComponent },
  { path: 'storefront-copy', component: PartnerSettingsStorefrontCopyComponent },
  { path: 'legal', component: PartnerSettingsLegalComponent },
  { path: 'address', component: PartnerSettingsAddressComponent },
  { path: 'contacts', component: PartnerSettingsContactsComponent },
  { path: 'mfa', component: PartnerSettingsMfaComponent },
];
