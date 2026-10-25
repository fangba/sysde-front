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
import {
  activityStatusView,
  formatHours,
  frequencyLabel,
  planStatusView,
  summarize,
} from '../data/planning.rules';
import { PlanningStore } from '../state/planning.store';
import { ReviewStore, type ActivityReviewRow } from '../state/review.store';
import { ReviewDesk } from '../ui/review-desk.component';
import { ActivityReviewDialog } from './activity-review.dialog';
import { PlanReviewDialog } from './review.dialog';

/** Validation des plannings annuels des collaborateurs du secteur (chef secteur). */
@Component({
  selector: 'sysde-valider-tab',
  imports: [ButtonComponent, CardComponent, DataTableComponent, EmptyStateComponent, ReviewDesk],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!readOnly()) {
      <sysde-review-desk />
    } @else if (store.status() === 'error') {
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

      <ui-card
        class="activities"
        [heading]="'Activités soumises ' + mine.year()"
        [subheading]="activitiesSubheading()"
      >
        <ui-data-table
          [columns]="activityColumns()"
          [rows]="store.activityRows()"
          [loading]="store.status() === 'loading'"
          [caption]="'Activités soumises ' + mine.year()"
          [rowLabel]="activityRowLabel"
          editLabel="Examiner l'activité de"
          editIcon="eye"
          searchPlaceholder="Rechercher une activité ou un collaborateur…"
          emptyTitle="Aucune activité soumise"
          emptyDescription="Les activités soumises une par une par vos collaborateurs apparaîtront ici."
          (rowEdit)="openActivity($event)"
        />
      </ui-card>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .activities {
      display: block;
      margin-top: 24px;
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

  protected readonly activitiesSubheading = computed(() => {
    if (this.readOnly()) {
      return 'Consultation des activités soumises par votre équipe.';
    }
    const pending = this.store.pendingActivities();
    return pending === 0
      ? 'Aucune activité en attente de validation.'
      : `${pending} activité${pending > 1 ? 's' : ''} en attente de validation.`;
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

  private nameOf(plan: AnnualPlan): string {
    const user = this.userOf(plan);
    return user ? `${user.lastName} ${user.firstName}` : '—';
  }

  protected readonly activityRowLabel = (row: ActivityReviewRow) =>
    `${this.settings.activityLabel(row.activityId)} de ${this.nameOf(row.plan)}`;

  protected readonly activityColumns = computed<readonly TableColumn<ActivityReviewRow>[]>(() => [
    {
      id: 'name',
      header: 'Collaborateur',
      text: (r) => this.nameOf(r.plan),
      sub: (r) => {
        const user = this.userOf(r.plan);
        return user ? POSTE_LABEL[user.poste] : '';
      },
    },
    {
      id: 'activity',
      header: 'Activité',
      text: (r) => this.settings.activityLabel(r.activityId),
    },
    {
      id: 'frequency',
      header: 'Fréquence',
      text: (r) => {
        const activity = this.settings.activityOf(r.activityId);
        return activity ? frequencyLabel(activity) : '—';
      },
      nowrap: true,
    },
    {
      id: 'dates',
      header: 'Dates',
      text: (r) => String(r.plan.lines.filter((l) => l.activityId === r.activityId).length),
      nowrap: true,
    },
    {
      id: 'status',
      header: 'Statut',
      text: (r) => activityStatusView(r.submission.status).label,
      pill: (r) => activityStatusView(r.submission.status),
    },
  ]);

  protected openActivity(row: ActivityReviewRow): void {
    this.dialog.open(ActivityReviewDialog, {
      data: { planId: row.plan.id, activityId: row.activityId, readOnly: this.readOnly() },
      injector: this.injector,
      panelClass: 'ui-drawer-panel',
      width: 'min(640px, 100vw)',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
    });
  }

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
