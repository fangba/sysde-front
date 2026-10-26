import { inject } from '@angular/core';
import type { Routes } from '@angular/router';

import { adminGuard } from '@core/auth/auth.guard';
import { CurrentUser } from '@core/auth/current-user';

import { PermissionsStore } from './state/permissions.store';
import { SettingsStore } from './state/settings.store';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    providers: [SettingsStore, PermissionsStore],
    loadComponent: () => import('./shell/settings.page').then((m) => m.SettingsPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        // Le chef secteur n'a que l'onglet Références.
        redirectTo: () => (inject(CurrentUser).isAdministrator() ? 'operateurs' : 'references'),
      },
      {
        path: 'operateurs',
        canActivate: [adminGuard],
        title: 'Opérateurs',
        loadComponent: () => import('./tabs/operators.tab').then((m) => m.OperatorsTab),
      },
      {
        path: 'contrats',
        canActivate: [adminGuard],
        title: 'Contrats',
        loadComponent: () => import('./tabs/contracts.tab').then((m) => m.ContractsTab),
      },
      {
        path: 'attribution',
        canActivate: [adminGuard],
        title: 'Attributions',
        loadComponent: () => import('./tabs/attributions.tab').then((m) => m.AttributionsTab),
      },
      {
        path: 'exercices',
        canActivate: [adminGuard],
        title: 'Exercices',
        loadComponent: () => import('./tabs/exercises.tab').then((m) => m.ExercisesTab),
      },
      {
        path: 'activites',
        canActivate: [adminGuard],
        title: 'Activités',
        loadComponent: () => import('./tabs/activities.tab').then((m) => m.ActivitiesTab),
      },
      {
        path: 'permissions',
        canActivate: [adminGuard],
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
