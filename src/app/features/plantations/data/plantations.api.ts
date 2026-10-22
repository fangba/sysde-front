import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { delay, map, of } from 'rxjs';

import { CurrentUser } from '@core/auth/current-user';

import { buildDemoPlantations } from './plantations.demo';
import { toPlantation } from './plantations.mapper';
import type { Plantation, PlantationDto } from './plantations.models';

/**
 * Accès aux plantations, fournies par une base externe (lecture seule).
 * L'étendue visible (organisme, opérateur, secteur) est appliquée côté serveur.
 */
export abstract class PlantationsApi {
  abstract list(): Observable<readonly Plantation[]>;
}

@Injectable()
export class HttpPlantationsApi extends PlantationsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<readonly Plantation[]> {
    return this.http
      .get<readonly PlantationDto[]>('/plantations')
      .pipe(map((rows) => rows.map(toPlantation)));
  }
}

@Injectable()
export class DemoPlantationsApi extends PlantationsApi {
  private readonly currentUser = inject(CurrentUser);

  list(): Observable<readonly Plantation[]> {
    const user = this.currentUser.user();
    const all = buildDemoPlantations();
    const visible = this.currentUser.hasGlobalView()
      ? all
      : this.currentUser.isDepartmentHead()
        ? all.filter((p) => p.operator === user.operator.acronym)
        : all.filter(
            (p) => p.operator === user.operator.acronym && p.sectorCode === user.sector?.code,
          );
    return of(visible).pipe(delay(250));
  }
}
