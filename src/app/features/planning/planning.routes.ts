import { inject } from '@angular/core';
import { Router, type CanActivateFn, type Routes } from '@angular/router';

import { CurrentUser } from '@core/auth/current-user';
import { APP_CONFIG } from '@core/config/app-config';

import { DemoSettingsApi, HttpSettingsApi, SettingsApi } from '../settings/data/settings.api';
import { SettingsStore } from '../settings/state/settings.store';
import { planningTabsFor } from './planning.access';
import { PlanningStore } from './state/planning.store';
import { ReviewStore } from './state/review.store';

/** Onglets autorisés pour le profil connecté ; renvoie vers Élaboration si la route est interdite. */
const tabGuard: CanActivateFn = (route) => {
  const user = inject(CurrentUser);
  const tabs = planningTabsFor({
    sectorHead: user.isSectorHead(),
    secretary: user.isSecretary(),
  });
  const path = route.routeConfig?.path;
  return tabs.some((tab) => tab.path === path)
    ? true
    : inject(Router).createUrlTree(['/planning', tabs[0]?.path ?? 'elaboration']);
};

/**
 * Les noms des collaborateurs et les lots viennent des données des Paramètres : le store et
 * l'API sont réutilisés comme dans le menu Tâches.
 */
export const PLANNING_ROUTES: Routes = [
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
      PlanningStore,
      ReviewStore,
    ],
    loadComponent: () => import('./shell/planning.page').then((m) => m.PlanningPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'elaboration' },
      {
        path: 'elaboration',
        title: 'Élaboration',
        canActivate: [tabGuard],
        loadComponent: () => import('./tabs/elaborer.tab').then((m) => m.ElaborerTab),
      },
      {
        path: 'validation',
        title: 'Validation',
        canActivate: [tabGuard],
        loadComponent: () => import('./tabs/valider.tab').then((m) => m.ValiderTab),
      },
      {
        path: 'equipe',
        canActivate: [tabGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Équipe',
            loadComponent: () => import('./tabs/equipe.tab').then((m) => m.EquipeTab),
          },
          {
            path: ':userId',
            title: 'Planning d’un collaborateur',
            loadComponent: () => import('./tabs/saisie.page').then((m) => m.SaisiePage),
          },
        ],
      },
    ],
  },
];
