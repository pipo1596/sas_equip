import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { RouteReuseStrategy, provideRouter, withRouterConfig } from '@angular/router';
import { ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

class NoReuseStrategy implements RouteReuseStrategy {
  shouldDetach(): boolean { return false; }
  store(): void {}
  shouldAttach(): boolean { return false; }
  retrieve(): DetachedRouteHandle | null { return null; }
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return future.routeConfig === curr.routeConfig && future.routeConfig !== null;
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'reload' })),
    provideClientHydration(withEventReplay()),
    { provide: RouteReuseStrategy, useClass: NoReuseStrategy },
  ],
};
