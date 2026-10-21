import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type { Credentials, PasswordChange, Session } from './auth.models';

/** Accès à l'authentification ; deux implémentations interchangeables (démo et HTTP). */
export abstract class AuthApi {
  abstract login(credentials: Credentials): Observable<Session>;
  abstract changePassword(change: PasswordChange): Observable<void>;
}

/**
 * Appelle le back Spring Boot : `POST {apiBaseUrl}/auth/login` → `{ token, user }` et
 * `POST {apiBaseUrl}/auth/mot-de-passe` avec `{ currentPassword, newPassword }` (réponse 204).
 */
@Injectable()
export class HttpAuthApi extends AuthApi {
  private readonly http = inject(HttpClient);

  login(credentials: Credentials): Observable<Session> {
    return this.http.post<Session>('/auth/login', credentials);
  }

  changePassword({ currentPassword, newPassword }: PasswordChange): Observable<void> {
    return this.http.post<void>('/auth/mot-de-passe', { currentPassword, newPassword });
  }
}
