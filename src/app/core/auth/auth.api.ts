import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type { Credentials, Session } from './auth.models';

/** Accès à l'authentification ; deux implémentations interchangeables (démo et HTTP). */
export abstract class AuthApi {
  abstract login(credentials: Credentials): Observable<Session>;
}

/** Appelle le back Spring Boot : `POST {apiBaseUrl}/auth/login` → `{ token, user }`. */
@Injectable()
export class HttpAuthApi extends AuthApi {
  private readonly http = inject(HttpClient);

  login(credentials: Credentials): Observable<Session> {
    return this.http.post<Session>('/auth/login', credentials);
  }
}
