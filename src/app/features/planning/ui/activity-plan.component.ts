import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, computed, inject } from '@angular/core';

import { ToastService } from '@core/notifications/toast.service';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import {
  OptionsMenuComponent,
  type OptionItem,
} from '@shared/ui/options-menu/options-menu.component';
import type { Tone } from '@shared/models/tone';

import type { Activity } from '../../settings/data/settings.models';
import {
  activityStatusView,
  checkMessage,
  frequencyLabel,
  planStatusView,
} from '../data/planning.rules';
import { PlanningStore, type ActivityCheckState } from '../state/planning.store';
import { ActivityDetailsDialog } from '../tabs/activity-details.dialog';

const STATE_VIEW: Readonly<Record<ActivityCheckState, { label: string; tone: Tone }>> = {
  TO_CHECK: { label: 'À vérifier', tone: 'neutral' },
  OK: { label: 'Actif', tone: 'green' },
  KO: { label: 'Inactif', tone: 'red' },
};

const BASE_OPTIONS: readonly OptionItem[] = [
  { id: 'see', label: 'Détails', icon: 'eye' },
  { id: 'check', label: 'Vérifier', icon: 'check' },
];
const OPTIONS_WITH_SUBMIT: readonly OptionItem[] = [
  ...BASE_OPTIONS,
  { id: 'submit', label: 'Soumettre', icon: 'send' },
];

const ALERT_DURATION_MS = 8000;

/**
 * Activités du chef secteur avec leur fréquence annuelle et l'état de cohérence de leurs dates.
 * « Voir » liste les dates programmées ; « Vérifier » contrôle les dates face à la fréquence.
 */
@Component({
  selector: 'sysde-activity-plan',
  imports: [DataTableComponent, OptionsMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-data-table
      [columns]="columns"
      [rows]="activities()"
      [rowActions]="actions"
      [caption]="'Activités du planning ' + store.year()"
      [rowLabel]="rowLabel"
      [loading]="loading()"
      searchPlaceholder="Rechercher une activité…"
      emptyTitle="Aucune activité"
      emptyDescription="Aucune activité n'est configurée pour votre poste."
    />

    <ng-template #actions let-row>
      <ui-options-menu
        [items]="optionsOf(row)"
        [ariaLabel]="'Options de ' + row.label"
        (chosen)="run($event, row)"
      />
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ActivityPlan {
  protected readonly store = inject(PlanningStore);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  readonly loading = computed(() => this.store.status() === 'loading');
  protected readonly activities = this.store.activities;
  protected readonly rowLabel = (a: Activity) => a.label;

  protected readonly columns: readonly TableColumn<Activity>[] = [
    { id: 'year', header: 'Année', text: () => String(this.store.year()), nowrap: true },
    {
      id: 'activity',
      header: 'Activité',
      text: (a) => a.label,
    },
    { id: 'category', header: 'Catégorie', text: (a) => this.store.categoryLabel(a.id) },
    { id: 'frequency', header: 'Fréquence', text: (a) => frequencyLabel(a), nowrap: true },
    {
      id: 'status',
      header: 'Statut',
      text: (a) => this.view(a).label,
      pill: (a) => this.view(a),
    },
  ];

  /** « Soumettre » n'est proposé qu'aux postes qui ont un validateur, pour une activité modifiable. */
  protected optionsOf(activity: Activity): readonly OptionItem[] {
    return this.store.canSubmitActivities() && !this.store.isLocked(activity.id)
      ? OPTIONS_WITH_SUBMIT
      : BASE_OPTIONS;
  }

  /** La soumission à la validation prime sur l'état de la dernière vérification. */
  private view(activity: Activity): { label: string; tone: Tone } {
    const submission = this.store.submissionOf(activity.id);
    if (submission) {
      return activityStatusView(submission.status);
    }
    const plan = this.store.plan();
    if (plan && plan.status !== 'BROUILLON') {
      return planStatusView(plan);
    }
    return STATE_VIEW[this.store.checkStates()[activity.id] ?? 'TO_CHECK'];
  }

  protected run(action: string, activity: Activity): void {
    if (action === 'see') {
      this.dialog.open(ActivityDetailsDialog, {
        panelClass: 'ui-drawer-panel',
        width: 'min(640px, 100vw)',
        height: '100%',
        maxHeight: '100vh',
        backdropClass: 'ui-dialog-backdrop',
        data: { activityId: activity.id },
        injector: this.injector,
      });
    } else if (action === 'submit') {
      this.store.submitActivity(activity.id);
    } else {
      this.verify(activity);
    }
  }

  private verify(activity: Activity): void {
    const check = this.store.verify(activity.id);
    if (check) {
      const { tone, text } = checkMessage(activity, check);
      this.toast.show(text, tone, tone === 'warning' ? ALERT_DURATION_MS : undefined);
    }
  }
}
