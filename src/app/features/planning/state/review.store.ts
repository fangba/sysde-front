import { Injectable, computed, inject, signal } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { toApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';

import { PlanningApi } from '../data/planning.api';
import type { ActivitySubmission, AnnualPlan, PlanDecision } from '../data/planning.models';
import { PlanningStore, type PlanLoadStatus } from './planning.store';

const ORDER = { SOUMIS: 0, BROUILLON: 1, VALIDE: 2 } as const;
const ACTIVITY_ORDER = { SOUMIS: 0, REJETE: 1, VALIDE: 2 } as const;

/** Une activité soumise seule par un collaborateur. */
export interface ActivityReviewRow {
  /** Identifiant de ligne du tableau : planning et activité. */
  readonly id: string;
  readonly plan: AnnualPlan;
  readonly activityId: string;
  readonly submission: ActivitySubmission;
}

/** Plannings des collaborateurs d'un chef secteur, à valider ou à rejeter. */
@Injectable()
export class ReviewStore {
  private readonly api = inject(PlanningApi);
  private readonly toast = inject(ToastService);
  private readonly mine = inject(PlanningStore);
  private readonly currentUser = inject(CurrentUser);

  readonly plans = signal<readonly AnnualPlan[]>([]);
  readonly status = signal<PlanLoadStatus>('loading');
  readonly error = signal('');
  readonly deciding = signal(false);

  /** Les plannings à valider passent en premier. */
  readonly sorted = computed(() =>
    [...this.plans()].sort((a, b) => ORDER[a.status] - ORDER[b.status]),
  );
  readonly pending = computed(() => this.plans().filter((p) => p.status === 'SOUMIS').length);

  /** Une ligne par collaborateur et activité soumise ; celles à décider passent en premier. */
  readonly activityRows = computed<readonly ActivityReviewRow[]>(() =>
    this.plans()
      .flatMap((plan) =>
        (plan.submissions ?? []).map((submission) => ({
          id: `${plan.id}|${submission.activityId}`,
          plan,
          activityId: submission.activityId,
          submission,
        })),
      )
      .sort((a, b) => ACTIVITY_ORDER[a.submission.status] - ACTIVITY_ORDER[b.submission.status]),
  );
  readonly pendingActivities = computed(
    () => this.activityRows().filter((r) => r.submission.status === 'SOUMIS').length,
  );

  load(): void {
    this.status.set('loading');
    // La secrétaire consulte les plannings de l'équipe, sans pouvoir les décider.
    const plans$ =
      this.currentUser.user().poste === 'SE'
        ? this.api.team(this.mine.year())
        : this.api.toReview(this.mine.year());
    plans$.subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.error.set(toApiError(error).message);
        this.status.set('error');
      },
    });
  }

  /** Valide ou rejette ; `onDone` est appelé en cas de succès (fermeture du panneau). */
  decide(plan: AnnualPlan, decision: PlanDecision, onDone: () => void): void {
    if (this.deciding()) {
      return;
    }
    this.deciding.set(true);
    this.api.decide(plan.id, decision).subscribe({
      next: (updated) => {
        this.plans.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        this.deciding.set(false);
        this.toast.show(
          decision.approve ? 'Le planning a été validé.' : 'Le planning a été rejeté.',
          'success',
        );
        onDone();
      },
      error: (error: unknown) => {
        this.deciding.set(false);
        this.toast.show(toApiError(error).message, 'error');
      },
    });
  }

  /** Valide ou rejette une activité soumise seule ; `onDone` est appelé en cas de succès. */
  decideActivity(
    plan: AnnualPlan,
    activityId: string,
    decision: PlanDecision,
    onDone: () => void,
  ): void {
    if (this.deciding()) {
      return;
    }
    this.deciding.set(true);
    this.api.decideActivity(plan.id, activityId, decision).subscribe({
      next: (updated) => {
        this.plans.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        this.deciding.set(false);
        this.toast.show(
          decision.approve ? "L'activité a été validée." : "L'activité a été rejetée.",
          'success',
        );
        onDone();
      },
      error: (error: unknown) => {
        this.deciding.set(false);
        this.toast.show(toApiError(error).message, 'error');
      },
    });
  }
}
