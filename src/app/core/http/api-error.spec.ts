import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, toApiError } from './api-error';

describe('toApiError', () => {
  it('traduit un statut connu', () => {
    const error = toApiError(new HttpErrorResponse({ status: 404 }));
    expect(error.status).toBe(404);
    expect(error.message).toContain('introuvable');
  });

  it('signale un serveur injoignable', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 })).message).toContain('injoignable');
  });

  it('regroupe les erreurs 5xx', () => {
    expect(toApiError(new HttpErrorResponse({ status: 503 })).message).toContain('serveur');
  });

  it('laisse passer une ApiError et enveloppe le reste', () => {
    const original = new ApiError(409, 'conflit');
    expect(toApiError(original)).toBe(original);
    expect(toApiError(new Error('x'))).toBeInstanceOf(ApiError);
  });
});
