import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PartnerDashboardComponent } from './partner-dashboard/partner-dashboard.component';
import { PartnerProductsComponent } from './partner-products/partner-products.component';
import { PartnerUniformProgramsComponent } from './partner-uniform-programs/partner-uniform-programs.component';
import { PartnerRolesComponent } from './partner-roles/partner-roles.component';
import { PartnerCustomersComponent } from './partner-customers/partner-customers.component';
import { PartnerEmployeesComponent } from './partner-employees/partner-employees.component';
import { PartnerSettingsIdentityComponent } from './partner-settings-identity/partner-settings-identity.component';
import { PartnerSettingsAddressComponent } from './partner-settings-address/partner-settings-address.component';
import { PartnerSettingsContactsComponent } from './partner-settings-contacts/partner-settings-contacts.component';
import { PartnerSettingsOrganizationComponent } from './partner-settings-organization/partner-settings-organization.component';
import { PartnerSettingsBrandingComponent } from './partner-settings-branding/partner-settings-branding.component';
import { PartnerSettingsSocialComponent } from './partner-settings-social/partner-settings-social.component';
import { PartnerSettingsStorefrontCopyComponent } from './partner-settings-storefront-copy/partner-settings-storefront-copy.component';
import { PartnerSettingsLegalComponent } from './partner-settings-legal/partner-settings-legal.component';
import { PartnerSettingsMfaComponent } from './partner-settings-mfa/partner-settings-mfa.component';
import { PartnerUsersComponent } from './partner-users/partner-users.component';
import { PartnerUserFormComponent } from './partner-users/partner-user-form.component';
import { ProductFormComponent } from './products/product-form.component';
import { ProductDetailComponent } from './products/product-detail.component';
import { ProductSkuDetailComponent } from './products/product-sku-detail.component';
import { BrandsComponent } from './products/brands.component';
import { BrandFormComponent } from './products/brand-form.component';
import { CategoriesComponent } from './products/categories.component';
import { CategoryFormComponent } from './products/category-form.component';

const routes: Routes = [
  { path: ':id/dashboard', component: PartnerDashboardComponent },

  // ── Products (static sub-routes MUST come before :productId) ──────────────
  { path: ':id/products', component: PartnerProductsComponent, pathMatch: 'full' },
  { path: ':id/products/new', component: ProductFormComponent },
  { path: ':id/products/brands', component: BrandsComponent },
  { path: ':id/products/brands/new', component: BrandFormComponent },
  { path: ':id/products/brands/:brandId/edit', component: BrandFormComponent },
  { path: ':id/products/categories', component: CategoriesComponent },
  { path: ':id/products/categories/new', component: CategoryFormComponent },
  { path: ':id/products/categories/:categoryId/edit', component: CategoryFormComponent },
  { path: ':id/products/:productId', component: ProductDetailComponent },
  { path: ':id/products/:productId/skus/new', component: ProductSkuDetailComponent },
  { path: ':id/products/:productId/skus/:skuId', component: ProductSkuDetailComponent },

  // ── Other sections ─────────────────────────────────────────────────────────
  { path: ':id/uniform-programs', component: PartnerUniformProgramsComponent },
  { path: ':id/roles', component: PartnerRolesComponent },
  { path: ':id/customers', component: PartnerCustomersComponent },
  { path: ':id/employees', component: PartnerEmployeesComponent },

  // ── Settings ───────────────────────────────────────────────────────────────
  { path: ':id/settings/users', component: PartnerUsersComponent },
  { path: ':id/settings/users/new', component: PartnerUserFormComponent },
  { path: ':id/settings/users/:userId/edit', component: PartnerUserFormComponent },
  { path: ':id/settings', pathMatch: 'full', redirectTo: ({ params }) => `/partner/${params['id']}/settings/identity` },
  { path: ':id/settings/identity', component: PartnerSettingsIdentityComponent },
  { path: ':id/settings/organization', component: PartnerSettingsOrganizationComponent },
  { path: ':id/settings/branding', component: PartnerSettingsBrandingComponent },
  { path: ':id/settings/social', component: PartnerSettingsSocialComponent },
  { path: ':id/settings/storefront-copy', component: PartnerSettingsStorefrontCopyComponent },
  { path: ':id/settings/legal', component: PartnerSettingsLegalComponent },
  { path: ':id/settings/address', component: PartnerSettingsAddressComponent },
  { path: ':id/settings/contacts', component: PartnerSettingsContactsComponent },
  { path: ':id/settings/mfa', component: PartnerSettingsMfaComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PartnerRoutingModule {}
