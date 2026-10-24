import { DIALOG_DATA, Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, computed, inject } from '@angular/core';

import { formatDate } from '@shared/util/format';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

import type { PlanLine } from '../data/planning.models';
import { activityStatusView, annualTotal, frequencyLabel } from '../data/planning.rules';
import { PlanningStore } from '../state/planning.store';
import { PlanCalendar } from '../ui/plan-calendar.component';
import { PlanLineDialog } from './line.dialog';

export interface ActivityDetailsData {
  readonly activityId: string;
}

/** Détails d'une activité : ses dates programmées sur le calendrier, ajout et modification d'une date. */
@Component({
  selector: 'sysde-activity-details-dialog',
  imports: [DialogShellComponent, PlanCalendar, StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell [title]="label()" [subtitle]="subtitle()">
      <div class="head">
        <ui-status-pill
          [tone]="expected() === null ? 'neutral' : count() === expected() ? 'green' : 'amber'"
        >
          {{ count() }} programmée{{ count() > 1 ? 's' : '' }}
        </ui-status-pill>
        <span class="meta">Fréquence demandée : {{ frequency() }}</span>
      </div>

      @if (submission(); as submission) {
        <div class="state" [class.state--rejected]="submission.status === 'REJETE'" role="status">
          <ui-status-pill [tone]="submissionView().tone">{{
            submissionView().label
          }}</ui-status-pill>
          @switch (submission.status) {
            @case ('SOUMIS') {
              <span>En attente de la décision du chef secteur : les dates sont verrouillées.</span>
            }
            @case ('VALIDE') {
              <span>Validée par le chef secteur : les dates ne sont plus modifiables.</span>
            }
            @case ('REJETE') {
              <span>
                Rejetée le {{ formatDate(submission.rejection?.date ?? '') }} :
                {{ submission.rejection?.reason }}
              </span>
            }
          }
        </div>
      }

      @if (check(); as check) {
        @if (!check.ok) {
          <div class="notice" role="status">
            <strong>Dates à corriger</strong>
            <ul>
              @for (issue of check.issues; track issue) {
                <li>{{ issue }}</li>
              }
            </ul>
          </div>
        }
      }

      <sysde-plan-calendar
        [year]="year()"
        [lines]="dates()"
        [categoryOf]="categoryOf"
        [labelOf]="labelOf"
        [editable]="editable()"
        [shownCategories]="categories()"
        [pinDetail]="true"
        (lineEdit)="open($event)"
        (dayAdd)="open(null, $event)"
      />
    </ui-dialog-shell>
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .meta {
      font-size: 13px;
      color: var(--ink-500);
    }
    .state {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      font-size: 13px;
      color: var(--ink-700);
    }
    .state--rejected {
      color: var(--red-700);
    }
    .notice {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: var(--radius-md);
      background: var(--amber-100);
      color: var(--amber-700);
      font-size: 13px;
      line-height: 1.5;
    }
    .notice ul {
      margin: 6px 0 0;
      padding-left: 18px;
    }
  `,
})
export class ActivityDetailsDialog {
  private readonly store = inject(PlanningStore);
  private readonly id = inject<ActivityDetailsData>(DIALOG_DATA).activityId;
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  /** Les dates ne se modifient que tant que l'activité n'est ni soumise ni validée. */
  protected readonly editable = computed(() => !this.store.isLocked(this.id));
  protected readonly submission = computed(() => this.store.submissionOf(this.id));
  protected readonly submissionView = computed(() =>
    activityStatusView(this.submission()?.status ?? 'SOUMIS'),
  );
  protected readonly formatDate = formatDate;

  private readonly activity = computed(() => this.store.activities().find((a) => a.id === this.id));
  protected readonly label = computed(() => this.activity()?.label ?? 'Activité');
  protected readonly subtitle = computed(() => `Dates programmées en ${this.store.year()}`);
  protected readonly dates = computed(() => this.store.datesOf(this.id));
  protected readonly count = computed(() => this.dates().length);
  protected readonly expected = computed(() => annualTotal(this.activity()?.frequency ?? null));
  protected readonly frequency = computed(() => {
    const activity = this.activity();
    return activity ? frequencyLabel(activity) : '—';
  });
  protected readonly check = computed(() => this.store.checkOf(this.id));

  protected readonly categories = computed(() => {
    const category = this.activity()?.category;
    return category ? [category] : [];
  });
  protected readonly year = this.store.year;
  protected readonly categoryOf = (id: string) => this.store.categoryOf(id);
  protected readonly labelOf = (id: string) => this.store.activityLabel(id);

  protected open(line: PlanLine | null, date?: string): void {
    this.dialog.open(PlanLineDialog, {
      panelClass: 'ui-drawer-panel',
      width: 'min(520px, 100vw)',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
      data: { item: line, activityId: this.id, date },
      injector: this.injector,
    });
  }
}
