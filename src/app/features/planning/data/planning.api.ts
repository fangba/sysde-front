import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { delay, of, throwError, type Observable } from 'rxjs';

import { PLANNING_POSTES } from '@core/auth/access';
import { APP_CONFIG } from '@core/config/app-config';
import { CurrentUser } from '@core/auth/current-user';
import { ApiError } from '@core/http/api-error';
import { todayIso } from '@shared/util/dates';
import { uniqueId } from '@shared/util/ids';

import { DEMO_ACTIVITIES, DEMO_USERS } from '../../settings/data/settings.demo';
import { DEMO_PLANS } from './planning.demo';
import type { AnnualPlan, PlanDecision, PlanLineInput } from './planning.models';
import {
  checkFrequency,
  isActivityLocked,
  sortLines,
  submissionOf,
  validateLine,
  withSubmission,
} from './planning.rules';

/**
 * Contrat d'accès aux plannings annuels. Le back décide de l'état à la soumission : le planning
 * d'un chef secteur n'a pas de validateur et passe directement à « validé ».
 */
@Injectable({
  providedIn: 'root',
  useFactory: () =>
    inject(APP_CONFIG).useDemoData ? inject(DemoPlanningApi) : inject(HttpPlanningApi),
})
export abstract class PlanningApi {
  /**
   * Planning de l'utilisateur connecté pour une année (créé vide s'il n'existe pas). La secrétaire
   * passe `userId` pour lire, saisir et soumettre le planning d'un collaborateur de son secteur.
   */
  abstract mine(year: number, userId?: string): Observable<AnnualPlan>;
  /** Remplace toutes les lignes d'un planning en brouillon. */
  abstract saveLines(
    year: number,
    lines: readonly PlanLineInput[],
    userId?: string,
  ): Observable<AnnualPlan>;
  abstract submit(year: number, userId?: string): Observable<AnnualPlan>;
  /**
   * Soumet une seule activité au chef secteur : ses dates sont verrouillées jusqu'à sa décision.
   * Refusée si l'activité n'a aucune date ou si ses dates ne sont pas cohérentes avec sa fréquence.
   */
  abstract submitActivity(year: number, activityId: string): Observable<AnnualPlan>;
  /** Plannings des collaborateurs du chef secteur connecté. */
  abstract toReview(year: number): Observable<readonly AnnualPlan[]>;
  /** Plannings de l'équipe du secteur, en lecture seule (chef secteur et secrétaire). */
  abstract team(year: number): Observable<readonly AnnualPlan[]>;
  abstract decide(planId: string, decision: PlanDecision): Observable<AnnualPlan>;
  /** Valide ou rejette (avec motif) une activité soumise seule. */
  abstract decideActivity(
    planId: string,
    activityId: string,
    decision: PlanDecision,
  ): Observable<AnnualPlan>;
}

/** Appelle la passerelle Spring Boot : `{apiBaseUrl}/plannings/…`. */
@Injectable({ providedIn: 'root' })
export class HttpPlanningApi extends PlanningApi {
  private readonly http = inject(HttpClient);

  /** Planning de l'utilisateur connecté, ou celui d'un collaborateur quand `userId` est donné. */
  private base(userId?: string): string {
    return userId ? `/plannings/collaborateurs/${userId}` : '/plannings/mon-planning';
  }

  mine(year: number, userId?: string): Observable<AnnualPlan> {
    return this.http.get<AnnualPlan>(this.base(userId), { params: { annee: year } });
  }

  saveLines(
    year: number,
    lines: readonly PlanLineInput[],
    userId?: string,
  ): Observable<AnnualPlan> {
    return this.http.put<AnnualPlan>(`${this.base(userId)}/lignes`, lines, {
      params: { annee: year },
    });
  }

  submit(year: number, userId?: string): Observable<AnnualPlan> {
    return this.http.post<AnnualPlan>(
      `${this.base(userId)}/soumission`,
      {},
      { params: { annee: year } },
    );
  }

  submitActivity(year: number, activityId: string): Observable<AnnualPlan> {
    return this.http.post<AnnualPlan>(
      `/plannings/mon-planning/activites/${activityId}/soumission`,
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

  decideActivity(
    planId: string,
    activityId: string,
    decision: PlanDecision,
  ): Observable<AnnualPlan> {
    const base = `/plannings/${planId}/activites/${activityId}`;
    return decision.approve
      ? this.http.post<AnnualPlan>(`${base}/validation`, {})
      : this.http.post<AnnualPlan>(`${base}/rejet`, { motif: decision.reason });
  }
}

const LATENCY_MS = 250;

/** Plannings en mémoire, pour le mode démonstration. */
@Injectable({ providedIn: 'root' })
export class DemoPlanningApi extends PlanningApi {
  private readonly currentUser = inject(CurrentUser);
  private readonly plans = new Map<string, AnnualPlan>(
    DEMO_PLANS.map((plan) => [key(plan.userId, plan.year), plan]),
  );

  private me() {
    const email = this.currentUser.user().email.toLowerCase();
    return DEMO_USERS.find((u) => u.email === email);
  }

  /**
   * Le titulaire du planning : soi-même, ou — pour la secrétaire — un collaborateur de son
   * secteur (chef secteur compris). `null` si l'accès n'est pas permis.
   */
  private owner(userId?: string) {
    const me = this.me();
    if (!userId || userId === me?.id) {
      return me ?? null;
    }
    const target = DEMO_USERS.find((u) => u.id === userId);
    const allowed =
      me?.poste === 'SE' &&
      !!target &&
      target.active &&
      target.poste !== 'SE' &&
      PLANNING_POSTES.includes(target.poste) &&
      target.operatorId === me.operatorId &&
      target.sectorId === me.sectorId;
    return allowed ? target : null;
  }

  private stamp(plan: AnnualPlan, userId?: string): AnnualPlan {
    const me = this.me();
    return {
      ...plan,
      editedBy: userId && userId !== me?.id ? 'SECRETARY' : 'SELF',
      editedAt: new Date().toISOString(),
    };
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

  mine(year: number, userId?: string): Observable<AnnualPlan> {
    const me = this.owner(userId);
    return me
      ? of(this.plan(me.id, year)).pipe(delay(LATENCY_MS))
      : throwError(() => new ApiError(403, "Vous n'avez pas accès à cette ressource."));
  }

  saveLines(
    year: number,
    lines: readonly PlanLineInput[],
    userId?: string,
  ): Observable<AnnualPlan> {
    const me = this.owner(userId);
    if (!me) {
      return throwError(() => new ApiError(403, "Vous n'avez pas accès à cette ressource."));
    }
    const current = this.plan(me.id, year);
    if (current.status !== 'BROUILLON') {
      return throwError(() => new ApiError(409, "Ce planning n'est plus modifiable."));
    }
    const signature = (items: readonly PlanLineInput[], activityId: string) =>
      items
        .filter((l) => l.activityId === activityId)
        .map((l) => `${l.date}~${l.endDate}~${l.place}~${l.plantation ?? ''}`)
        .sort()
        .join('|');
    const lockedChanged = (current.submissions ?? [])
      .filter((s) => isActivityLocked(current, s.activityId))
      .some((s) => signature(lines, s.activityId) !== signature(current.lines, s.activityId));
    if (lockedChanged) {
      return throwError(
        () => new ApiError(409, "Les dates d'une activité soumise ne sont plus modifiables."),
      );
    }
    const saved = lines.map((line) => ({ ...line, id: uniqueId('ligne') }));
    const invalid = saved
      .map((line) => validateLine(line, year, saved, line.id))
      .find((message) => message !== null);
    if (invalid) {
      return throwError(() => new ApiError(400, invalid));
    }
    return of(this.store(this.stamp({ ...current, lines: sortLines(saved) }, userId))).pipe(
      delay(LATENCY_MS),
    );
  }

  submit(year: number, userId?: string): Observable<AnnualPlan> {
    const me = this.owner(userId);
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
    const kept = (current.submissions ?? []).filter((s) => s.status === 'VALIDE');
    const submitted: AnnualPlan = { ...current, status, submissions: kept };
    delete (submitted as { rejection?: unknown }).rejection;
    return of(this.store(submitted)).pipe(delay(LATENCY_MS));
  }

  submitActivity(year: number, activityId: string): Observable<AnnualPlan> {
    const me = this.me();
    if (!me) {
      return throwError(() => new ApiError(403, "Vous n'avez pas accès à cette ressource."));
    }
    const current = this.plan(me.id, year);
    if (me.poste === 'CS') {
      return throwError(
        () => new ApiError(409, "Le planning du chef secteur est validé d'office."),
      );
    }
    if (current.status !== 'BROUILLON') {
      return throwError(() => new ApiError(409, 'Ce planning a déjà été soumis.'));
    }
    const activity = DEMO_ACTIVITIES.find(
      (a) => a.id === activityId && a.poste === me.poste && a.active,
    );
    if (!activity) {
      return throwError(
        () => new ApiError(400, "Cette activité n'est pas proposée à votre poste."),
      );
    }
    if (isActivityLocked(current, activityId)) {
      return throwError(() => new ApiError(409, 'Cette activité a déjà été soumise.'));
    }
    const lines = current.lines.filter((l) => l.activityId === activityId);
    if (lines.length === 0) {
      return throwError(
        () => new ApiError(400, 'Ajoutez au moins une date avant de soumettre cette activité.'),
      );
    }
    const check = checkFrequency(activity, lines);
    if (!check.ok) {
      return throwError(
        () =>
          new ApiError(
            400,
            `Les dates de « ${activity.label} » ne sont pas cohérentes : ${check.issues[0]}`,
          ),
      );
    }
    const next: AnnualPlan = {
      ...current,
      submissions: withSubmission(current, activityId, { activityId, status: 'SOUMIS' }),
    };
    return of(this.store(next)).pipe(delay(LATENCY_MS));
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
        (u.poste !== 'CS' || me.poste === 'SE') &&
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

  decideActivity(
    planId: string,
    activityId: string,
    decision: PlanDecision,
  ): Observable<AnnualPlan> {
    const current = [...this.plans.values()].find((plan) => plan.id === planId);
    if (!current) {
      return throwError(() => new ApiError(404, 'La ressource demandée est introuvable.'));
    }
    if (submissionOf(current, activityId)?.status !== 'SOUMIS') {
      return throwError(
        () => new ApiError(409, "Cette activité n'est pas en attente de validation."),
      );
    }
    if (!decision.approve && !decision.reason.trim()) {
      return throwError(() => new ApiError(400, 'Le motif du rejet est obligatoire.'));
    }
    const next: AnnualPlan = {
      ...current,
      submissions: withSubmission(
        current,
        activityId,
        decision.approve
          ? { activityId, status: 'VALIDE' }
          : {
              activityId,
              status: 'REJETE',
              rejection: { reason: decision.reason.trim(), date: todayIso(new Date()) },
            },
      ),
    };
    return of(this.store(next)).pipe(delay(LATENCY_MS));
  }
}

function key(userId: string, year: number): string {
  return `${userId}|${year}`;
}
