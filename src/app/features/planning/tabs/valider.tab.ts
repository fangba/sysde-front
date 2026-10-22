import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

import { POSTE_LABEL } from '../../settings/data/settings.constants';
import type { User } from '../../settings/data/settings.models';
import { SettingsStore } from '../../settings/state/settings.store';
import type { AnnualPlan } from '../data/planning.models';
import { formatHours, planStatusView, summarize } from '../data/planning.rules';
import { PlanningStore } from '../state/planning.store';
import { ReviewStore } from '../state/review.store';
import { PlanReviewDialog } from './review.dialog';

/** Validation des plannings annuels des collaborateurs du secteur (chef secteur). */
@Component({
  selector: 'sysde-valider-tab',
  imports: [ButtonComponent, CardComponent, DataTableComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.status() === 'error') {
      <ui-card>
        <ui-empty-state
          icon="alert"
          tone="red"
          title="Chargement impossible"
          [description]="store.error()"
        >
          <button ui-button variant="primary" type="button" (click)="store.load()">
            Réessayer
          </button>
        </ui-empty-state>
      </ui-card>
    } @else {
      <ui-card
        [heading]="'Plannings des collaborateurs ' + mine.year()"
        [subheading]="subheading()"
      >
        <ui-data-table
          [columns]="columns()"
          [rows]="store.sorted()"
          [loading]="store.status() === 'loading'"
          [caption]="'Plannings des collaborateurs ' + mine.year()"
          [rowLabel]="rowLabel"
          editLabel="Examiner le planning de"
          editIcon="eye"
          searchPlaceholder="Rechercher un collaborateur…"
          emptyTitle="Aucun collaborateur"
          emptyDescription="Aucun collaborateur de votre secteur n'a de planning à examiner."
          (rowEdit)="open($event)"
        />
      </ui-card>
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ValiderTab {
  protected readonly store = inject(ReviewStore);
  protected readonly mine = inject(PlanningStore);
  private readonly settings = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  private readonly currentUser = inject(CurrentUser);
  protected readonly readOnly = this.currentUser.isSecretary;

  protected readonly subheading = computed(() => {
    if (this.readOnly()) {
      return 'Consultation des plannings de votre secteur.';
    }
    const pending = this.store.pending();
    return pending === 0
      ? 'Aucun planning en attente de validation.'
      : `${pending} planning${pending > 1 ? 's' : ''} en attente de validation.`;
  });

  constructor() {
    // Recharge à l'ouverture de l'onglet et à chaque changement d'année.
    effect(() => {
      this.mine.year();
      untracked(() => this.store.load());
    });
  }

  private userOf(plan: AnnualPlan): User | undefined {
    return this.settings.users.items().find((u) => u.id === plan.userId);
  }

  protected readonly rowLabel = (plan: AnnualPlan) => {
    const user = this.userOf(plan);
    return user ? `${user.firstName} ${user.lastName}` : 'collaborateur';
  };

  protected readonly columns = computed<readonly TableColumn<AnnualPlan>[]>(() => [
    {
      id: 'name',
      header: 'Collaborateur',
      text: (p) => {
        const user = this.userOf(p);
        return user ? `${user.lastName} ${user.firstName}` : '—';
      },
      sub: (p) => {
        const user = this.userOf(p);
        return user ? POSTE_LABEL[user.poste] : '';
      },
    },
    { id: 'lines', header: 'Activités', text: (p) => String(p.lines.length) },
    {
      id: 'hours',
      header: 'Durée prévue',
      text: (p) => `${formatHours(summarize(p.lines).hours)} h`,
    },
    {
      id: 'status',
      header: 'Statut',
      text: (p) => planStatusView(p).label,
      pill: (p) => planStatusView(p),
    },
  ]);

  protected open(plan: AnnualPlan): void {
    this.dialog.open(PlanReviewDialog, {
      data: { planId: plan.id, readOnly: this.readOnly() },
      injector: this.injector,
      panelClass: 'ui-drawer-panel',
      width: 'min(760px, 100vw)',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
    });
  }
}
