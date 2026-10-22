import type { Routes } from '@angular/router';

import { DashboardApi, DemoDashboardApi, HttpDashboardApi } from './data/dashboard.api';
import { APP_CONFIG } from '@core/config/app-config';
import { inject } from '@angular/core';
import { DashboardStore } from './state/dashboard.store';
import { DemoPlanningApi, HttpPlanningApi, PlanningApi } from '../planning/data/planning.api';
import { PlanningStore } from '../planning/state/planning.store';
import { DemoSettingsApi, HttpSettingsApi, SettingsApi } from '../settings/data/settings.api';
import { SettingsStore } from '../settings/state/settings.store';

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
      // Dashboards des collaborateurs : planning et référentiel des activités.
      SettingsStore,
      DemoSettingsApi,
      HttpSettingsApi,
      {
        provide: SettingsApi,
        useFactory: () =>
          inject(APP_CONFIG).useDemoData ? inject(DemoSettingsApi) : inject(HttpSettingsApi),
      },
      DemoPlanningApi,
      HttpPlanningApi,
      {
        provide: PlanningApi,
        useFactory: () =>
          inject(APP_CONFIG).useDemoData ? inject(DemoPlanningApi) : inject(HttpPlanningApi),
      },
      PlanningStore,
    ],
    loadComponent: () => import('./dashboard.host').then((m) => m.DashboardHost),
  },
];
