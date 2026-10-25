import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { concat, defer, forkJoin, map, toArray } from 'rxjs';

import { CurrentUser } from '@core/auth/current-user';
import { toApiError } from '@core/http/api-error';
import { NotificationService } from '@core/notifications/notification.service';
import { ToastService } from '@core/notifications/toast.service';

import type { User } from '../../settings/data/settings.models';
import { SettingsStore } from '../../settings/state/settings.store';
import { PendingReviewService } from './pending-review.service';
import { PlanningApi } from '../data/planning.api';
import type { ActivitySubmission, AnnualPlan, PlanDecision } from '../data/planning.models';
import { checkFrequency } from '../data/planning.rules';
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

/** Ce que le chef secteur doit décider : un planning complet ou une activité soumise seule. */
export interface ReviewItem {
  readonly id: string;
  readonly kind: 'PLAN' | 'ACTIVITY';
  readonly plan: AnnualPlan;
  /** Renseignée pour une activité soumise seule. */
  readonly activityId?: string;
}

/** Contrôle d'une activité face à sa fréquence. */
export interface ActivityAssessment {
  readonly activityId: string;
  readonly label: string;
  readonly lines: AnnualPlan['lines'];
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly expected: number | null;
}

/** Résultat du contrôle automatique d'un élément : « prêt » s'il n'a aucune anomalie. */
export interface ItemAssessment {
  readonly activities: readonly ActivityAssessment[];
  readonly ready: boolean;
}

/** Plannings des collaborateurs d'un chef secteur, à valider ou à rejeter. */
@Injectable()
export class ReviewStore {
  private readonly api = inject(PlanningApi);
  private readonly toast = inject(ToastService);
  private readonly notifications = inject(NotificationService);
  private readonly mine = inject(PlanningStore);
  private readonly currentUser = inject(CurrentUser);
  private readonly settings = inject(SettingsStore);
  private readonly badge = inject(PendingReviewService);

  constructor() {
    // Garde la pastille du menu à jour après chaque décision (année en cours seulement).
    effect(() => {
      if (
        this.status() === 'ready' &&
        this.currentUser.isSectorHead() &&
        this.mine.year() === new Date().getFullYear()
      ) {
        this.badge.count.set(this.pendingTotal());
      }
    });
  }

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

  /** Tout ce qui attend une décision : plannings soumis, puis activités soumises seules. */
  readonly items = computed<readonly ReviewItem[]>(() => [
    ...this.plans()
      .filter((p) => p.status === 'SOUMIS')
      .map<ReviewItem>((plan) => ({ id: plan.id, kind: 'PLAN', plan })),
    ...this.activityRows()
      .filter((r) => r.submission.status === 'SOUMIS' && r.plan.status !== 'SOUMIS')
      .map<ReviewItem>((r) => ({
        id: r.id,
        kind: 'ACTIVITY',
        plan: r.plan,
        activityId: r.activityId,
      })),
  ]);
  readonly pendingTotal = computed(() => this.items().length);

  /** Contrôle automatique de chaque élément, recalculé quand les données changent. */
  readonly assessments = computed<ReadonlyMap<string, ItemAssessment>>(
    () => new Map(this.items().map((item) => [item.id, this.assess(item)])),
  );

  userOf(plan: AnnualPlan): User | undefined {
    return this.settings.users.items().find((u) => u.id === plan.userId);
  }

  /** Prévient le collaborateur de la décision du chef secteur. */
  private notifyDecision(
    plan: AnnualPlan,
    activityId: string | null,
    decision: PlanDecision,
  ): void {
    const email = this.userOf(plan)?.email;
    if (!email) {
      return;
    }
    const what = activityId
      ? `Votre activité « ${this.settings.activityLabel(activityId)} »`
      : `Votre planning ${plan.year}`;
    if (decision.approve) {
      this.notifications.notify(
        email,
        activityId ? 'Activité validée' : 'Planning validé',
        `${what} a été validé par votre chef secteur.`,
        'success',
      );
    } else {
      this.notifications.notify(
        email,
        activityId ? 'Activité rejetée' : 'Planning rejeté',
        `${what} a été rejeté. Motif : ${decision.reason}`,
        'error',
      );
    }
  }

  private assess(item: ReviewItem): ItemAssessment {
    const user = this.userOf(item.plan);
    const ids =
      item.kind === 'ACTIVITY'
        ? [item.activityId!]
        : this.settings.activities
            .items()
            .filter((a) => a.active && a.poste === user?.poste)
            .map((a) => a.id);
    const activities = ids.flatMap((id) => {
      const activity = this.settings.activityOf(id);
      if (!activity) {
        return [];
      }
      const lines = item.plan.lines.filter((l) => l.activityId === id);
      const check = checkFrequency(activity, lines);
      return [
        {
          activityId: id,
          label: activity.label,
          lines,
          ok: check.ok,
          issues: check.issues,
          expected: check.expected,
        },
      ];
    });
    return { activities, ready: activities.every((a) => a.ok) };
  }

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
        this.notifyDecision(plan, null, decision);
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
        this.notifyDecision(plan, activityId, decision);
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

  /** Valide plusieurs éléments d'un coup ; `onDone` est appelé quand tous ont répondu. */
  approveMany(items: readonly ReviewItem[], onDone: () => void): void {
    if (this.deciding() || items.length === 0) {
      return;
    }
    this.deciding.set(true);
    // Plannings différents en parallèle ; les éléments d'un même planning un par un, pour que
    // deux activités validées ensemble ne s'écrasent pas.
    const perPlan = new Map<string, ReviewItem[]>();
    for (const item of items) {
      perPlan.set(item.plan.id, [...(perPlan.get(item.plan.id) ?? []), item]);
    }
    const groups = [...perPlan.values()].map((group) =>
      concat(
        ...group.map((item) =>
          defer(() =>
            item.kind === 'PLAN'
              ? this.api.decide(item.plan.id, { approve: true })
              : this.api.decideActivity(item.plan.id, item.activityId!, { approve: true }),
          ),
        ),
      ).pipe(toArray()),
    );
    forkJoin(groups)
      .pipe(map((results) => results.flat()))
      .subscribe({
        next: (updated) => {
          // Un planning peut apparaître plusieurs fois : le dernier état reçu l'emporte.
          const byId = new Map(updated.map((p) => [p.id, p]));
          this.plans.update((list) => list.map((p) => byId.get(p.id) ?? p));
          this.deciding.set(false);
          for (const item of items) {
            this.notifyDecision(item.plan, item.kind === 'ACTIVITY' ? item.activityId! : null, {
              approve: true,
            });
          }
          this.toast.show(
            items.length === 1
              ? 'Un élément a été validé.'
              : `${items.length} éléments ont été validés.`,
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
