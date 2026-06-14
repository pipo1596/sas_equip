import { Component } from '@angular/core';

interface MaintenanceCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  standalone: false,
})
export class DashboardComponent {
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
      color: '#1e3a8a',
    },
    {
      title: 'Audit Log',
      description: 'Browse and filter system audit events across all entities.',
      icon: 'bi-journal-text',
      route: 'audit-log',
      color: '#6c757d',
    },
    {
      title: 'Reports',
      description: 'View and export system reports and analytics.',
      icon: 'bi-bar-chart-line',
      route: '/reports',
      color: '#0d9488',
    },
  ];
}
