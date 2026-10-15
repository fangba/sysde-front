import type { Routes } from '@angular/router';

import { NAV_ITEMS } from './layout/nav.config';

const placeholderRoutes: Routes = NAV_ITEMS.filter((item) => item.path !== 'tableau-de-bord').map(
  (item) => ({
    path: item.path,
    title: item.label,
    data: { title: item.label },
    loadComponent: () =>
      import('./features/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
  }),
);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      {
        path: 'tableau-de-bord',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
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
