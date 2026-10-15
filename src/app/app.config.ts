import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { environment } from '@env/environment';

import { routes } from './app.routes';
import { APP_CONFIG } from './core/config/app-config';
import { apiUrlInterceptor } from './core/http/api-url.interceptor';
import { httpErrorInterceptor } from './core/http/http-error.interceptor';
import { AppTitleStrategy } from './core/routing/app-title.strategy';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([apiUrlInterceptor, httpErrorInterceptor])),
    { provide: APP_CONFIG, useValue: environment },
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};
