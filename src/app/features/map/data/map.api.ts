import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { delay, map, of } from 'rxjs';

import { buildCatalog, buildPlantations } from './map.demo';
import type { MapFilter, MapOperatorOption, MapPlantation } from './map.models';

/** Contrat d'accès aux données de la carte ; deux implémentations interchangeables. */
export abstract class MapApi {
  abstract catalog(): Observable<readonly MapOperatorOption[]>;
  abstract plantations(filter: MapFilter): Observable<readonly MapPlantation[]>;
}

@Injectable()
export class HttpMapApi extends MapApi {
  private readonly http = inject(HttpClient);

  catalog(): Observable<readonly MapOperatorOption[]> {
    return this.http.get<readonly MapOperatorOption[]>('/carte/catalogue');
  }

  plantations(filter: MapFilter): Observable<readonly MapPlantation[]> {
    let params = new HttpParams().set('operatorId', filter.operatorId);
    if (filter.sectorId) {
      params = params.set('sectorId', filter.sectorId);
    }
    if (filter.lot !== undefined) {
      params = params.set('lot', filter.lot);
    }
    if (filter.section) {
      params = params.set('section', filter.section);
    }
    return this.http.get<readonly MapPlantation[]>('/carte/plantations', { params });
  }
}

@Injectable()
export class DemoMapApi extends MapApi {
  catalog(): Observable<readonly MapOperatorOption[]> {
    return of(buildCatalog()).pipe(delay(200));
  }

  plantations(filter: MapFilter): Observable<readonly MapPlantation[]> {
    return of(buildPlantations()).pipe(
      delay(250),
      map((all) =>
        all.filter(
          (p) =>
            p.operatorId === filter.operatorId &&
            (!filter.sectorId || p.sectorId === filter.sectorId) &&
            (filter.lot === undefined || p.lot === filter.lot) &&
            (!filter.section || p.section === filter.section),
        ),
      ),
    );
  }
}
