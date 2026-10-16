import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { delay, of } from 'rxjs';

import type { DashboardData } from './dashboard.models';
import { DEMO_DASHBOARD } from './dashboard.demo';
import type { DashboardScope } from './dashboard.profile';
import { scopeDashboard } from './dashboard.scope';

/** Contrat d'accès aux données du tableau de bord ; deux implémentations interchangeables. */
export abstract class DashboardApi {
  abstract load(scope: DashboardScope): Observable<DashboardData>;
}

/** Appelle la passerelle Spring Boot (`GET {apiBaseUrl}/dashboard`). */
@Injectable()
export class HttpDashboardApi extends DashboardApi {
  private readonly http = inject(HttpClient);

  load(scope: DashboardScope): Observable<DashboardData> {
    let params = new HttpParams().set('profile', scope.profile).set('operator', scope.operator);
    if (scope.sector) {
      params = params.set('sector', scope.sector);
    }
    if (scope.filterOperator) {
      params = params.set('filterOperator', scope.filterOperator);
    }
    if (scope.filterSector) {
      params = params.set('filterSector', scope.filterSector);
    }
    return this.http.get<DashboardData>('/dashboard', { params });
  }
}

/** Données locales, avec un court délai pour montrer les états de chargement. */
@Injectable()
export class DemoDashboardApi extends DashboardApi {
  load(scope: DashboardScope): Observable<DashboardData> {
    return of(scopeDashboard(DEMO_DASHBOARD, scope)).pipe(delay(350));
  }
}
