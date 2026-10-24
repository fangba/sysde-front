import { inject } from '@angular/core';
import { Router, type CanActivateFn, type Route, type Routes } from '@angular/router';

import { CurrentUser } from '@core/auth/current-user';
import { APP_CONFIG } from '@core/config/app-config';

import { DemoSettingsApi, HttpSettingsApi, SettingsApi } from '../settings/data/settings.api';
import { SettingsStore } from '../settings/state/settings.store';
import { tasksTabsFor } from './tasks.access';
import type { StaffKind } from './tabs/staff.config';

/** Onglets autorisés pour le profil connecté ; renvoie vers le premier si la route est interdite. */
const tabGuard: CanActivateFn = (route) => {
  const user = inject(CurrentUser);
  const tabs = tasksTabsFor({
    administrator: user.isAdministrator(),
    departmentHead: user.isDepartmentHead(),
    sectorHead: user.isSectorHead(),
  });
  const path = route.routeConfig?.path;
  return tabs.some((tab) => tab.path === path)
    ? true
    : inject(Router).createUrlTree(['/taches', tabs[0].path]);
};

const staffRoute = (path: string, title: string, kind: StaffKind): Route => ({
  path,
  title,
  canActivate: [tabGuard],
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
        canActivate: [tabGuard],
        loadComponent: () => import('./tabs/users.tab').then((m) => m.UsersTab),
      },
      staffRoute('chefs-departement', 'Chef département', 'chef-departement'),
      staffRoute('chefs-secteur', 'Chef secteur', 'chef-secteur'),
      staffRoute('collaborateurs', 'Collaborateurs', 'collaborateur'),
    ],
  },
];
