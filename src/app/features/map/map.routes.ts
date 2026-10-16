import { inject } from '@angular/core';
import type { Routes } from '@angular/router';

import { APP_CONFIG } from '@core/config/app-config';

import { DemoMapApi, HttpMapApi, MapApi } from './data/map.api';
import { MapStore } from './state/map.store';

export const MAP_ROUTES: Routes = [
  {
    path: '',
    title: 'Carte',
    providers: [
      MapStore,
      DemoMapApi,
      HttpMapApi,
      {
        provide: MapApi,
        useFactory: () =>
          inject(APP_CONFIG).useDemoData ? inject(DemoMapApi) : inject(HttpMapApi),
      },
    ],
    loadComponent: () => import('./map.page').then((m) => m.MapPage),
  },
];
