import { Injectable, effect, inject, signal } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';

import { PlanningApi } from '../data/planning.api';
import type { AnnualPlan } from '../data/planning.models';

/** Nombre d'éléments en attente de décision d'après une liste de plannings. */
export function countPending(plans: readonly AnnualPlan[]): number {
  return plans.reduce((total, plan) => {
    if (plan.status === 'SOUMIS') {
      return total + 1;
    }
    return total + (plan.submissions ?? []).filter((s) => s.status === 'SOUMIS').length;
  }, 0);
}

/**
 * Pastille « à valider » du chef secteur, lisible partout (menu latéral) alors que les stores du
 * Planning ne vivent que dans leur route. `ReviewStore` la tient à jour après chaque décision.
 */
@Injectable({ providedIn: 'root' })
export class PendingReviewService {
  private readonly api = inject(PlanningApi);
  private readonly currentUser = inject(CurrentUser);

  readonly count = signal(0);

  constructor() {
    // Charge le compteur à la connexion d'un chef secteur ; il retombe à 0 pour les autres.
    effect(() => {
      if (this.currentUser.isSectorHead()) {
        this.refresh();
      } else {
        this.count.set(0);
      }
    });
  }

  refresh(): void {
    this.api.toReview(new Date().getFullYear()).subscribe({
      next: (plans) => this.count.set(countPending(plans)),
      error: () => this.count.set(0),
    });
  }
}
