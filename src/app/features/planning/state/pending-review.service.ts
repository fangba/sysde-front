import { Injectable, effect, inject, signal } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';

import { PlanningApi } from '../data/planning.api';
import type { AnnualPlan } from '../data/planning.models';
import { rosterStatusOf } from '../data/planning.rules';
import { needsAction } from '../data/roster';

/** Nombre d'éléments en attente de décision d'après une liste de plannings. */
export function countPending(plans: readonly AnnualPlan[]): number {
  return plans.reduce((total, plan) => {
    if (plan.status === 'SOUMIS') {
      return total + 1;
    }
    return total + (plan.submissions ?? []).filter((s) => s.status === 'SOUMIS').length;
  }, 0);
}

/** Plannings de l'équipe que la secrétaire doit encore saisir, compléter ou corriger. */
export function countToDo(plans: readonly AnnualPlan[]): number {
  return plans.filter((plan) => needsAction(rosterStatusOf(plan))).length;
}

/**
 * Pastille du menu Planning : « à valider » pour le chef secteur, « à traiter » pour la secrétaire
 * (plannings à saisir, à compléter ou à corriger), lisible partout (menu latéral) alors que les stores du
 * Planning ne vivent que dans leur route. `ReviewStore` la tient à jour après chaque décision.
 */
@Injectable({ providedIn: 'root' })
export class PendingReviewService {
  private readonly api = inject(PlanningApi);
  private readonly currentUser = inject(CurrentUser);

  readonly count = signal(0);

  constructor() {
    // Charge le compteur à la connexion d'un chef secteur ou d'une secrétaire ; 0 pour les autres.
    effect(() => {
      if (this.currentUser.isSectorHead() || this.currentUser.isSecretary()) {
        this.refresh();
      } else {
        this.count.set(0);
      }
    });
  }

  refresh(): void {
    const year = new Date().getFullYear();
    const secretary = this.currentUser.isSecretary();
    (secretary ? this.api.team(year) : this.api.toReview(year)).subscribe({
      next: (plans) => this.count.set(secretary ? countToDo(plans) : countPending(plans)),
      error: () => this.count.set(0),
    });
  }
}
