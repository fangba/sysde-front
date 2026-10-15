import type { Routes } from '@angular/router';

import { DashboardApi, DemoDashboardApi, HttpDashboardApi } from './data/dashboard.api';
import { APP_CONFIG } from '@core/config/app-config';
import { inject } from '@angular/core';
import { DashboardStore } from './state/dashboard.store';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'Dashboard',
    providers: [
      DashboardStore,
      DemoDashboardApi,
      HttpDashboardApi,
      {
        provide: DashboardApi,
        useFactory: () =>
          inject(APP_CONFIG).useDemoData ? inject(DemoDashboardApi) : inject(HttpDashboardApi),
      },
    ],
    loadComponent: () => import('./dashboard.page').then((m) => m.DashboardPage),
  },
];
