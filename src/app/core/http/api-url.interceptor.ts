import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { APP_CONFIG } from '@core/config/app-config';

const ABSOLUTE_URL = /^https?:\/\//i;

/** Préfixe les URL relatives avec l'adresse de l'API définie dans l'environnement. */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (ABSOLUTE_URL.test(req.url)) {
    return next(req);
  }
  const { apiBaseUrl } = inject(APP_CONFIG);
  const url = `${apiBaseUrl.replace(/\/+$/, '')}/${req.url.replace(/^\/+/, '')}`;
  return next(req.clone({ url }));
};
