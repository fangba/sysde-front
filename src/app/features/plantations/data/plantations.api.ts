import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { delay, forkJoin, map, switchMap, throwError } from 'rxjs';

import { CurrentUser } from '@core/auth/current-user';
import { ApiError } from '@core/http/api-error';

import { SettingsApi } from '../../settings/data/settings.api';
import { buildDemoPlantations } from './plantations.demo';
import { toPlantation } from './plantations.mapper';
import type { Plantation, PlantationDto } from './plantations.models';
import { sectionsFor } from './plantations.rules';

/** Affectation d'une plantation à une section ; `sectionId` nul retire l'affectation. */
export interface SectionAssignment {
  readonly plantationId: string;
  readonly sectionId: string | null;
}

/**
 * Accès aux plantations, fournies par une base externe (lecture seule). Seule l'affectation à une
 * section est propre à SysDE : elle est enregistrée par le chef secteur. L'étendue visible
 * (organisme, opérateur, secteur) est appliquée côté serveur.
 */
export abstract class PlantationsApi {
  abstract list(): Observable<readonly Plantation[]>;
  /** Affecte une plantation à une section de son lot (chef secteur de son secteur seulement). */
  abstract assign(plantationId: string, sectionId: string | null): Observable<Plantation>;
  /** Affecte plusieurs plantations en une fois (import Excel) ; renvoie celles qui ont changé. */
  abstract assignMany(items: readonly SectionAssignment[]): Observable<readonly Plantation[]>;
}

@Injectable()
export class HttpPlantationsApi extends PlantationsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<readonly Plantation[]> {
    return this.http
      .get<readonly PlantationDto[]>('/plantations')
      .pipe(map((rows) => rows.map(toPlantation)));
  }

  assign(plantationId: string, sectionId: string | null): Observable<Plantation> {
    return this.http
      .put<PlantationDto>(`/plantations/${plantationId}/section`, { sectionId })
      .pipe(map(toPlantation));
  }

  assignMany(items: readonly SectionAssignment[]): Observable<readonly Plantation[]> {
    return this.http
      .put<readonly PlantationDto[]>('/plantations/affectations', items)
      .pipe(map((rows) => rows.map(toPlantation)));
  }
}

@Injectable()
export class DemoPlantationsApi extends PlantationsApi {
  private readonly currentUser = inject(CurrentUser);
  private readonly settings = inject(SettingsApi);
  /** Affectations enregistrées (plantation → section), le temps de la session. */
  private readonly assignments = new Map<string, string>();

  private visible(): readonly Plantation[] {
    const user = this.currentUser.user();
    const all = buildDemoPlantations();
    return this.currentUser.hasGlobalView()
      ? all
      : this.currentUser.isDepartmentHead()
        ? all.filter((p) => p.operator === user.operator.acronym)
        : all.filter(
            (p) => p.operator === user.operator.acronym && p.sectorCode === user.sector?.code,
          );
  }

  /** Plantations visibles, avec leur affectation (si la section existe encore). */
  private withSections(): Observable<readonly Plantation[]> {
    return this.settings.sections.list().pipe(
      map((sections) => {
        const names = new Map(sections.map((s) => [s.id, s.name]));
        return this.visible().map((p) => {
          const sectionId = this.assignments.get(p.id);
          const sectionName = sectionId ? names.get(sectionId) : undefined;
          return sectionId && sectionName !== undefined ? { ...p, sectionId, sectionName } : p;
        });
      }),
    );
  }

  list(): Observable<readonly Plantation[]> {
    return this.withSections().pipe(delay(250));
  }

  assign(plantationId: string, sectionId: string | null): Observable<Plantation> {
    return this.assignMany([{ plantationId, sectionId }]).pipe(
      map((changed) => changed[0] as Plantation),
    );
  }

  assignMany(items: readonly SectionAssignment[]): Observable<readonly Plantation[]> {
    if (!this.currentUser.isSectorHead()) {
      return throwError(() => new ApiError(403, "Vous n'avez pas accès à cette ressource."));
    }
    return forkJoin({
      sections: this.settings.sections.list(),
      lots: this.settings.lots.list(),
      sectors: this.settings.sectors.list(),
    }).pipe(
      switchMap(({ sections, lots, sectors }) => {
        const own = new Map(this.visible().map((p) => [p.id, p]));
        // Tout est vérifié avant d'enregistrer : un lot d'affectations est accepté ou refusé en bloc.
        for (const { plantationId, sectionId } of items) {
          const plantation = own.get(plantationId);
          if (!plantation) {
            return throwError(() => new ApiError(404, 'La ressource demandée est introuvable.'));
          }
          if (
            sectionId !== null &&
            !sectionsFor(plantation, sections, lots, sectors).some((s) => s.id === sectionId)
          ) {
            return throwError(
              () =>
                new ApiError(400, 'La requête est invalide. Vérifiez les informations saisies.'),
            );
          }
        }
        for (const { plantationId, sectionId } of items) {
          if (sectionId === null) {
            this.assignments.delete(plantationId);
          } else {
            this.assignments.set(plantationId, sectionId);
          }
        }
        const wanted = new Set(items.map((i) => i.plantationId));
        return this.withSections().pipe(
          map((rows) => rows.filter((p) => wanted.has(p.id))),
          delay(250),
        );
      }),
    );
  }
}
