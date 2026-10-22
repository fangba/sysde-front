import { inject } from '@angular/core';
import type { Routes } from '@angular/router';

import { APP_CONFIG } from '@core/config/app-config';

import { DemoPlantationsApi, HttpPlantationsApi, PlantationsApi } from './data/plantations.api';
import { PlantationsStore } from './state/plantations.store';

export const PLANTATIONS_ROUTES: Routes = [
  {
    path: '',
    title: 'Plantations',
    providers: [
      PlantationsStore,
      DemoPlantationsApi,
      HttpPlantationsApi,
      {
        provide: PlantationsApi,
        useFactory: () =>
          inject(APP_CONFIG).useDemoData ? inject(DemoPlantationsApi) : inject(HttpPlantationsApi),
      },
    ],
    loadComponent: () => import('./plantations.page').then((m) => m.PlantationsPage),
  },
];
