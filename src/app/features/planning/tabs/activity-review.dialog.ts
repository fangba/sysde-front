import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { formatDate } from '@shared/util/format';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

import { POSTE_LABEL } from '../../settings/data/settings.constants';
import { SettingsStore } from '../../settings/state/settings.store';
import {
  activityStatusView,
  checkFrequency,
  frequencyLabel,
  submissionOf,
} from '../data/planning.rules';
import { ReviewStore } from '../state/review.store';
import { PlanCalendar } from '../ui/plan-calendar.component';

export interface ActivityReviewData {
  readonly planId: string;
  readonly activityId: string;
  /** Consultation seule : ni validation ni rejet (secrétaire). */
  readonly readOnly?: boolean;
}

const MIN_REASON = 5;

/** Examen d'une activité soumise seule : ses dates, leur cohérence, puis validation ou rejet. */
@Component({
  selector: 'sysde-activity-review-dialog',
  imports: [FormsModule, ButtonComponent, DialogShellComponent, PlanCalendar, StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell [title]="label()" [subtitle]="subtitle()">
      @if (submission(); as submission) {
        <div class="head">
          <ui-status-pill [tone]="statusView().tone">{{ statusView().label }}</ui-status-pill>
          <span class="meta">
            {{ lines().length }} date{{ lines().length > 1 ? 's' : '' }} programmée{{
              lines().length > 1 ? 's' : ''
            }}
            · Fréquence demandée : {{ frequency() }}
          </span>
        </div>

        @if (submission.status === 'REJETE' && submission.rejection) {
          <p class="ui-form__error">
            Rejetée le {{ formatDate(submission.rejection.date) }} :
            {{ submission.rejection.reason }}
          </p>
        }

        @if (!check().ok) {
          <div class="notice" role="status">
            <strong>Dates non cohérentes avec la fréquence</strong>
            <ul>
              @for (issue of check().issues; track issue) {
                <li>{{ issue }}</li>
              }
            </ul>
          </div>
        } @else {
          <p class="ui-form__note">Les dates sont cohérentes avec la fréquence demandée.</p>
        }

        <sysde-plan-calendar
          [year]="year()"
          [lines]="lines()"
          [categoryOf]="categoryOf"
          [labelOf]="labelOf"
          [shownCategories]="categories()"
          [pinDetail]="true"
        />

        @if (rejecting()) {
          <label class="reason">
            <span class="label">Motif du rejet <span aria-hidden="true">*</span></span>
            <textarea
              class="ui-input"
              rows="4"
              maxlength="500"
              [ngModel]="reason()"
              (ngModelChange)="reason.set($event)"
              placeholder="Expliquez ce que le collaborateur doit corriger."
            ></textarea>
            <span class="hint"
              >Le collaborateur verra ce motif. {{ MIN_REASON }} caractères minimum.</span
            >
          </label>
        }
      }

      <div dialogActions>
        @if (submission()?.status === 'SOUMIS' && !readOnly) {
          @if (rejecting()) {
            <button ui-button variant="ghost" type="button" (click)="rejecting.set(false)">
              Retour
            </button>
            <button
              ui-button
              variant="primary"
              type="button"
              [disabled]="reason().trim().length < MIN_REASON"
              [loading]="store.deciding()"
              (click)="decide(false)"
            >
              Confirmer le rejet
            </button>
          } @else {
            <button ui-button variant="secondary" type="button" (click)="rejecting.set(true)">
              Rejeter
            </button>
            <button
              ui-button
              variant="primary"
              type="button"
              [loading]="store.deciding()"
              (click)="decide(true)"
            >
              Valider
            </button>
          }
        } @else {
          <button ui-button variant="secondary" type="button" (click)="ref.close()">Fermer</button>
        }
      </div>
    </ui-dialog-shell>
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .meta {
      font-size: 13px;
      font-weight: 600;
      color: var(--ink-500);
    }
    .ui-form__error,
    .ui-form__note {
      margin-bottom: 14px;
    }
    .notice {
      margin-bottom: 14px;
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
    .reason {
      display: grid;
      gap: 6px;
      margin-top: 16px;
    }
    .label {
      font-size: 13px;
      font-weight: 600;
    }
    textarea.ui-input {
      height: auto;
      padding: 10px 12px;
      resize: vertical;
    }
    .hint {
      font-size: 12px;
      color: var(--ink-500);
    }
  `,
})
export class ActivityReviewDialog {
  protected readonly store = inject(ReviewStore);
  private readonly settings = inject(SettingsStore);
  protected readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly data = inject<ActivityReviewData>(DIALOG_DATA);
  protected readonly readOnly = this.data.readOnly === true;

  protected readonly MIN_REASON = MIN_REASON;
  protected readonly formatDate = formatDate;
  protected readonly rejecting = signal(false);
  protected readonly reason = signal('');
  protected readonly categoryOf = (id: string) => this.settings.activityOf(id)?.category;
  protected readonly labelOf = (id: string) => this.settings.activityLabel(id);

  /** Lu dans le store pour suivre la décision prise. */
  protected readonly plan = computed(() =>
    this.store.plans().find((p) => p.id === this.data.planId),
  );
  private readonly activity = computed(() => this.settings.activityOf(this.data.activityId));
  protected readonly submission = computed(() => submissionOf(this.plan(), this.data.activityId));
  protected readonly statusView = computed(() =>
    activityStatusView(this.submission()?.status ?? 'SOUMIS'),
  );
  protected readonly year = computed(() => this.plan()?.year ?? new Date().getFullYear());
  protected readonly lines = computed(() =>
    (this.plan()?.lines ?? []).filter((l) => l.activityId === this.data.activityId),
  );
  protected readonly categories = computed(() => {
    const category = this.activity()?.category;
    return category ? [category] : [];
  });
  protected readonly label = computed(() => this.activity()?.label ?? 'Activité');
  protected readonly frequency = computed(() => {
    const activity = this.activity();
    return activity ? frequencyLabel(activity) : '—';
  });
  protected readonly check = computed(() => {
    const activity = this.activity();
    return activity
      ? checkFrequency(activity, this.lines())
      : { ok: true, expected: null, actual: 0, issues: [] as string[] };
  });
  protected readonly subtitle = computed(() => {
    const user = this.settings.users.items().find((u) => u.id === this.plan()?.userId);
    return user
      ? `${user.firstName} ${user.lastName} · ${POSTE_LABEL[user.poste]} · Planning ${this.year()}`
      : `Planning ${this.year()}`;
  });

  protected decide(approve: boolean): void {
    const plan = this.plan();
    if (!plan) {
      return;
    }
    const decision = approve
      ? ({ approve: true } as const)
      : ({ approve: false, reason: this.reason().trim() } as const);
    this.store.decideActivity(plan, this.data.activityId, decision, () => this.ref.close());
  }
}
