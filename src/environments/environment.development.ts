import type { AppConfig } from '@core/config/app-config';

/** Environnement de développement local. */
export const environment: AppConfig = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  useDemoData: true,
};
