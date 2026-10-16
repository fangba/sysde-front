import type { Routes } from '@angular/router';

import { adminGuard, authGuard, guestGuard, reportingGuard } from './core/auth/auth.guard';
import { NAV_ITEMS } from './layout/nav.config';

const placeholderRoutes: Routes = NAV_ITEMS.filter(
  (item) =>
    item.path !== 'tableau-de-bord' &&
    item.path !== 'parametres' &&
    item.path !== 'taches' &&
    item.path !== 'carte' &&
    item.path !== 'reporting',
).map((item) => ({
  path: item.path,
  title: item.label,
  data: { title: item.label },
  loadComponent: () =>
    import('./features/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
}));

export const routes: Routes = [
  {
    path: 'connexion',
    title: 'Connexion',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      {
        path: 'tableau-de-bord',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'carte',
        title: 'Carte',
        loadChildren: () => import('./features/map/map.routes').then((m) => m.MAP_ROUTES),
      },
      {
        path: 'taches',
        loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.TASKS_ROUTES),
      },
      {
        path: 'reporting',
        title: 'Reporting',
        canActivate: [reportingGuard],
        loadComponent: () =>
          import('./features/reporting/reporting.page').then((m) => m.ReportingPage),
      },
      {
        path: 'parametres',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      ...placeholderRoutes,
      {
        path: '**',
        title: 'Page introuvable',
        loadComponent: () =>
          import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
