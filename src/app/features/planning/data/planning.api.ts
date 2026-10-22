import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { delay, of, throwError, type Observable } from 'rxjs';

import { PLANNING_POSTES } from '@core/auth/access';
import { CurrentUser } from '@core/auth/current-user';
import { ApiError } from '@core/http/api-error';
import { todayIso } from '@shared/util/dates';
import { uniqueId } from '@shared/util/ids';

import { DEMO_USERS } from '../../settings/data/settings.demo';
import { DEMO_PLANS } from './planning.demo';
import type { AnnualPlan, PlanDecision, PlanLineInput } from './planning.models';
import { sortLines, validateLine } from './planning.rules';

/**
 * Contrat d'accès aux plannings annuels. Le back décide de l'état à la soumission : le planning
 * d'un chef secteur n'a pas de validateur et passe directement à « validé ».
 */
export abstract class PlanningApi {
  /** Planning de l'utilisateur connecté pour une année (créé vide s'il n'existe pas). */
  abstract mine(year: number): Observable<AnnualPlan>;
  /** Remplace toutes les lignes d'un planning en brouillon. */
  abstract saveLines(year: number, lines: readonly PlanLineInput[]): Observable<AnnualPlan>;
  abstract submit(year: number): Observable<AnnualPlan>;
  /** Plannings des collaborateurs du chef secteur connecté. */
  abstract toReview(year: number): Observable<readonly AnnualPlan[]>;
  /** Plannings de l'équipe du secteur, en lecture seule (chef secteur et secrétaire). */
  abstract team(year: number): Observable<readonly AnnualPlan[]>;
  abstract decide(planId: string, decision: PlanDecision): Observable<AnnualPlan>;
}

/** Appelle la passerelle Spring Boot : `{apiBaseUrl}/plannings/…`. */
@Injectable()
export class HttpPlanningApi extends PlanningApi {
  private readonly http = inject(HttpClient);

  mine(year: number): Observable<AnnualPlan> {
    return this.http.get<AnnualPlan>('/plannings/mon-planning', { params: { annee: year } });
  }

  saveLines(year: number, lines: readonly PlanLineInput[]): Observable<AnnualPlan> {
    return this.http.put<AnnualPlan>('/plannings/mon-planning/lignes', lines, {
      params: { annee: year },
    });
  }

  submit(year: number): Observable<AnnualPlan> {
    return this.http.post<AnnualPlan>(
      '/plannings/mon-planning/soumission',
      {},
      { params: { annee: year } },
    );
  }

  toReview(year: number): Observable<readonly AnnualPlan[]> {
    return this.http.get<readonly AnnualPlan[]>('/plannings/a-valider', {
      params: { annee: year },
    });
  }

  team(year: number): Observable<readonly AnnualPlan[]> {
    return this.http.get<readonly AnnualPlan[]>('/plannings/equipe', { params: { annee: year } });
  }

  decide(planId: string, decision: PlanDecision): Observable<AnnualPlan> {
    return decision.approve
      ? this.http.post<AnnualPlan>(`/plannings/${planId}/validation`, {})
      : this.http.post<AnnualPlan>(`/plannings/${planId}/rejet`, { motif: decision.reason });
  }
}

const LATENCY_MS = 250;

/** Plannings en mémoire, pour le mode démonstration. */
@Injectable()
export class DemoPlanningApi extends PlanningApi {
  private readonly currentUser = inject(CurrentUser);
  private readonly plans = new Map<string, AnnualPlan>(
    DEMO_PLANS.map((plan) => [key(plan.userId, plan.year), plan]),
  );

  private me() {
    const email = this.currentUser.user().email.toLowerCase();
    return DEMO_USERS.find((u) => u.email === email);
  }

  private plan(userId: string, year: number): AnnualPlan {
    const found = this.plans.get(key(userId, year));
    if (found) {
      return found;
    }
    const created: AnnualPlan = {
      id: `plan-${userId}-${year}`,
      userId,
      year,
      status: 'BROUILLON',
      lines: [],
    };
    this.plans.set(key(userId, year), created);
    return created;
  }

  private store(plan: AnnualPlan): AnnualPlan {
    this.plans.set(key(plan.userId, plan.year), plan);
    return plan;
  }

  mine(year: number): Observable<AnnualPlan> {
    const me = this.me();
    return me
      ? of(this.plan(me.id, year)).pipe(delay(LATENCY_MS))
      : throwError(() => new ApiError(403, "Vous n'avez pas accès à cette ressource."));
  }

  saveLines(year: number, lines: readonly PlanLineInput[]): Observable<AnnualPlan> {
    const me = this.me();
    if (!me) {
      return throwError(() => new ApiError(403, "Vous n'avez pas accès à cette ressource."));
    }
    const current = this.plan(me.id, year);
    if (current.status !== 'BROUILLON') {
      return throwError(() => new ApiError(409, "Ce planning n'est plus modifiable."));
    }
    const saved = lines.map((line) => ({ ...line, id: uniqueId('ligne') }));
    const invalid = saved
      .map((line) => validateLine(line, year, saved, line.id))
      .find((message) => message !== null);
    if (invalid) {
      return throwError(() => new ApiError(400, invalid));
    }
    return of(this.store({ ...current, lines: sortLines(saved) })).pipe(delay(LATENCY_MS));
  }

  submit(year: number): Observable<AnnualPlan> {
    const me = this.me();
    if (!me) {
      return throwError(() => new ApiError(403, "Vous n'avez pas accès à cette ressource."));
    }
    const current = this.plan(me.id, year);
    if (current.status !== 'BROUILLON') {
      return throwError(() => new ApiError(409, 'Ce planning a déjà été soumis.'));
    }
    if (current.lines.length === 0) {
      return throwError(
        () => new ApiError(400, 'Ajoutez au moins une activité avant de soumettre.'),
      );
    }
    // Le chef secteur n'a pas de validateur : son planning est validé d'office.
    const status = me.poste === 'CS' ? 'VALIDE' : 'SOUMIS';
    const submitted: AnnualPlan = { ...current, status };
    delete (submitted as { rejection?: unknown }).rejection;
    return of(this.store(submitted)).pipe(delay(LATENCY_MS));
  }

  toReview(year: number): Observable<readonly AnnualPlan[]> {
    const me = this.me();
    if (!me || me.poste !== 'CS') {
      return throwError(() => new ApiError(403, "Vous n'avez pas accès à cette ressource."));
    }
    const team = DEMO_USERS.filter(
      (u) =>
        u.active &&
        u.poste !== 'CS' &&
        u.poste !== 'SE' &&
        PLANNING_POSTES.includes(u.poste) &&
        u.operatorId === me.operatorId &&
        u.sectorId === me.sectorId,
    );
    return of(team.map((u) => this.plan(u.id, year))).pipe(delay(LATENCY_MS));
  }

  team(year: number): Observable<readonly AnnualPlan[]> {
    const me = this.me();
    if (!me || (me.poste !== 'CS' && me.poste !== 'SE')) {
      return throwError(() => new ApiError(403, "Vous n'avez pas accès à cette ressource."));
    }
    const members = DEMO_USERS.filter(
      (u) =>
        u.active &&
        u.poste !== 'CS' &&
        u.poste !== 'SE' &&
        PLANNING_POSTES.includes(u.poste) &&
        u.operatorId === me.operatorId &&
        u.sectorId === me.sectorId,
    );
    return of(members.map((u) => this.plan(u.id, year))).pipe(delay(LATENCY_MS));
  }

  decide(planId: string, decision: PlanDecision): Observable<AnnualPlan> {
    const current = [...this.plans.values()].find((plan) => plan.id === planId);
    if (!current) {
      return throwError(() => new ApiError(404, 'La ressource demandée est introuvable.'));
    }
    if (current.status !== 'SOUMIS') {
      return throwError(() => new ApiError(409, "Ce planning n'est pas en attente de validation."));
    }
    if (!decision.approve && !decision.reason.trim()) {
      return throwError(() => new ApiError(400, 'Le motif du rejet est obligatoire.'));
    }
    const next: AnnualPlan = decision.approve
      ? { ...current, status: 'VALIDE' }
      : {
          ...current,
          status: 'BROUILLON',
          rejection: { reason: decision.reason.trim(), date: todayIso(new Date()) },
        };
    return of(this.store(next)).pipe(delay(LATENCY_MS));
  }
}

function key(userId: string, year: number): string {
  return `${userId}|${year}`;
}
