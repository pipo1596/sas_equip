import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-partner-settings',
  standalone: true,
  template: '',
})
export class PartnerSettingsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.router.navigate(['/partner', id, 'settings', 'identity'], { replaceUrl: true });
  }
}
