import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  readonly open = signal(true);
  toggle() { this.open.update(v => !v); }
}
