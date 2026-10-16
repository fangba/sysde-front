import { inject } from '@angular/core';
import type { Routes } from '@angular/router';

import { APP_CONFIG } from '@core/config/app-config';

import { DemoSettingsApi, HttpSettingsApi, SettingsApi } from '../settings/data/settings.api';
import { SettingsStore } from '../settings/state/settings.store';

/**
 * Les comptes utilisateur s'appuient sur les mêmes données que les paramètres
 * (opérateurs, secteurs) : le store et l'API sont donc réutilisés tels quels.
 */
export const TASKS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      SettingsStore,
      DemoSettingsApi,
      HttpSettingsApi,
      {
        provide: SettingsApi,
        useFactory: () =>
          inject(APP_CONFIG).useDemoData ? inject(DemoSettingsApi) : inject(HttpSettingsApi),
      },
    ],
    loadComponent: () => import('./shell/tasks.page').then((m) => m.TasksPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'utilisateurs' },
      {
        path: 'utilisateurs',
        title: 'Utilisateur',
        loadComponent: () => import('./tabs/users.tab').then((m) => m.UsersTab),
      },
    ],
  },
];
