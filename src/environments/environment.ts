import type { AppConfig } from '@core/config/app-config';

/** Environnement de production (remplacé par `environment.development.ts` en développement). */
export const environment: AppConfig = {
  production: true,
  apiBaseUrl: '/api',
  useDemoData: true,
};
