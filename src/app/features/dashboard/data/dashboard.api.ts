import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { delay, of } from 'rxjs';

import type { DashboardData } from './dashboard.models';
import { DEMO_DASHBOARD } from './dashboard.demo';

/** Contrat d'accès aux données du tableau de bord ; deux implémentations interchangeables. */
export abstract class DashboardApi {
  abstract load(): Observable<DashboardData>;
}

/** Appelle la passerelle Spring Boot (`GET {apiBaseUrl}/dashboard`). */
@Injectable()
export class HttpDashboardApi extends DashboardApi {
  private readonly http = inject(HttpClient);

  load(): Observable<DashboardData> {
    return this.http.get<DashboardData>('/dashboard');
  }
}

/** Données locales, avec un court délai pour montrer les états de chargement. */
@Injectable()
export class DemoDashboardApi extends DashboardApi {
  load(): Observable<DashboardData> {
    return of(DEMO_DASHBOARD).pipe(delay(350));
  }
}
