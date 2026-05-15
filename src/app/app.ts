import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  host: { '[class.app-ready]': 'ready()' },
})
export class App {
  protected readonly title = signal('sas-equip');
  readonly ready = signal(false);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      inject(Router).events.pipe(
        filter(e => e instanceof NavigationEnd),
        take(1),
      ).subscribe(() => this.ready.set(true));
    }
  }
}
