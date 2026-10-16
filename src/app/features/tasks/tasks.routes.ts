import { inject } from '@angular/core';
import type { Route, Routes } from '@angular/router';

import { APP_CONFIG } from '@core/config/app-config';

import { DemoSettingsApi, HttpSettingsApi, SettingsApi } from '../settings/data/settings.api';
import { SettingsStore } from '../settings/state/settings.store';
import type { StaffKind } from './tabs/staff.config';

const staffRoute = (path: string, title: string, kind: StaffKind): Route => ({
  path,
  title,
  data: { kind },
  loadComponent: () => import('./tabs/staff.tab').then((m) => m.StaffTab),
});

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
      staffRoute('chefs-departement', 'Chef département', 'chef-departement'),
      staffRoute('chefs-secteur', 'Chef secteur', 'chef-secteur'),
      staffRoute('collaborateurs', 'Collaborateur', 'collaborateur'),
    ],
  },
];
