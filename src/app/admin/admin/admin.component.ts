import { Component } from '@angular/core';

interface MaintenanceCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  standalone: false,
})
export class AdminComponent {
  readonly cards: MaintenanceCard[] = [
    {
      title: 'Platform Admins',
      description: 'Manage platform administrator accounts and permissions.',
      icon: 'bi-people',
      route: 'platform-admins',
      color: '#007bff',
    },
    {
      title: 'Tenant Partners',
      description: 'Manage tenant partner organisations and their access.',
      icon: 'bi-building-fill-lock',
      route: 'tenant-partners',
      color: '#c394c0',
    },
  ];
}
