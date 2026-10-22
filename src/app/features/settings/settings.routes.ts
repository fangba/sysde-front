import { inject } from '@angular/core';
import type { Routes } from '@angular/router';

import { APP_CONFIG } from '@core/config/app-config';

import { DemoSettingsApi, HttpSettingsApi, SettingsApi } from './data/settings.api';
import { PermissionsStore } from './state/permissions.store';
import { SettingsStore } from './state/settings.store';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      SettingsStore,
      PermissionsStore,
      DemoSettingsApi,
      HttpSettingsApi,
      {
        provide: SettingsApi,
        useFactory: () =>
          inject(APP_CONFIG).useDemoData ? inject(DemoSettingsApi) : inject(HttpSettingsApi),
      },
    ],
    loadComponent: () => import('./shell/settings.page').then((m) => m.SettingsPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'operateurs' },
      {
        path: 'operateurs',
        title: 'Opérateurs',
        loadComponent: () => import('./tabs/operators.tab').then((m) => m.OperatorsTab),
      },
      {
        path: 'contrats',
        title: 'Contrats',
        loadComponent: () => import('./tabs/contracts.tab').then((m) => m.ContractsTab),
      },
      {
        path: 'attribution',
        title: 'Attributions',
        loadComponent: () => import('./tabs/attributions.tab').then((m) => m.AttributionsTab),
      },
      {
        path: 'exercices',
        title: 'Exercices',
        loadComponent: () => import('./tabs/exercises.tab').then((m) => m.ExercisesTab),
      },
      {
        path: 'activites',
        title: 'Activités',
        loadComponent: () => import('./tabs/activities.tab').then((m) => m.ActivitiesTab),
      },
      {
        path: 'permissions',
        title: 'Permissions',
        loadComponent: () => import('./tabs/permissions.tab').then((m) => m.PermissionsTab),
      },
      {
        path: 'references',
        title: 'Références',
        loadComponent: () => import('./tabs/references.tab').then((m) => m.ReferencesTab),
      },
    ],
  },
];
