import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { formatDate } from '@shared/util/format';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

import { POSTE_LABEL } from '../../settings/data/settings.constants';
import { SettingsStore } from '../../settings/state/settings.store';
import { formatPeriod, planStatusView, summarize } from '../data/planning.rules';
import { ReviewStore } from '../state/review.store';
import { PlanCalendar } from '../ui/plan-calendar.component';

export interface ReviewDialogData {
  readonly planId: string;
  /** Consultation seule : ni validation ni rejet (secrétaire). */
  readonly readOnly?: boolean;
}

const MIN_REASON = 5;

/** Examen d'un planning : détail des activités, puis validation ou rejet avec motif. */
@Component({
  selector: 'sysde-plan-review-dialog',
  imports: [FormsModule, ButtonComponent, DialogShellComponent, PlanCalendar, StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell [title]="name()" [subtitle]="subtitle()">
      @if (plan(); as plan) {
        @let view = statusView();
        <div class="head">
          <ui-status-pill [tone]="view.tone">{{ view.label }}</ui-status-pill>
          <span class="meta">
            {{ summary().count }} activité{{ summary().count > 1 ? 's' : '' }} ·
            {{ summary().days }} jour{{ summary().days > 1 ? 's' : '' }}
          </span>
        </div>

        @if (plan.rejection && plan.status === 'BROUILLON') {
          <p class="ui-form__error">
            Rejeté le {{ formatDate(plan.rejection.date) }} : {{ plan.rejection.reason }}
          </p>
        } @else if (plan.status === 'BROUILLON') {
          <p class="ui-form__note">Ce planning n'a pas encore été soumis.</p>
        }

        <div class="seg" role="group" aria-label="Affichage du planning">
          <button
            type="button"
            [attr.aria-pressed]="display() === 'list'"
            (click)="display.set('list')"
          >
            Liste
          </button>
          <button
            type="button"
            [attr.aria-pressed]="display() === 'calendar'"
            (click)="display.set('calendar')"
          >
            Calendrier
          </button>
        </div>

        @if (display() === 'calendar') {
          <sysde-plan-calendar
            [year]="plan.year"
            [lines]="plan.lines"
            [categoryOf]="categoryOf"
            [labelOf]="labelOf"
          />
        } @else if (plan.lines.length > 0) {
          <div class="scroll">
            <table>
              <caption class="sr-only">
                Activités prévues
              </caption>
              <thead>
                <tr>
                  <th scope="col">Période</th>
                  <th scope="col">Activité</th>
                  <th scope="col">Lot / section</th>
                </tr>
              </thead>
              <tbody>
                @for (line of plan.lines; track line.id) {
                  <tr>
                    <td>{{ formatPeriod(line) }}</td>
                    <td>{{ activityLabel(line.activityId) }}</td>
                    <td>{{ line.place }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="empty">Aucune activité prévue.</p>
        }

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
        @if (plan()?.status === 'SOUMIS' && !readOnly) {
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
              (click)="reject()"
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
              (click)="approve()"
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
    .seg {
      display: inline-flex;
      margin-bottom: 14px;
      padding: 3px;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--neutral-100);
    }
    .seg button {
      height: 32px;
      padding: 0 14px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--ink-700);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .seg button[aria-pressed='true'] {
      background: var(--paper);
      color: var(--green-800);
      box-shadow: var(--shadow-sm);
    }
    .seg button:focus-visible {
      outline: 2px solid var(--spark-green);
      outline-offset: 1px;
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
    .scroll {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th,
    td {
      padding: 9px 12px;
      text-align: left;
      border-bottom: 1px solid var(--line);
    }
    th {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ink-500);
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    .num {
      text-align: right;
      white-space: nowrap;
    }
    .empty {
      padding: 18px;
      text-align: center;
      color: var(--ink-500);
      font-size: 13px;
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
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class PlanReviewDialog {
  protected readonly store = inject(ReviewStore);
  private readonly settings = inject(SettingsStore);
  protected readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly data = inject<ReviewDialogData>(DIALOG_DATA);
  private readonly planId = this.data.planId;
  protected readonly readOnly = this.data.readOnly === true;

  protected readonly MIN_REASON = MIN_REASON;
  protected readonly formatDate = formatDate;
  protected readonly display = signal<'list' | 'calendar'>('list');
  protected readonly rejecting = signal(false);
  protected readonly categoryOf = (id: string) => this.settings.activityOf(id)?.category;
  protected readonly labelOf = (id: string) => this.settings.activityLabel(id);
  protected readonly reason = signal('');

  /** Lu dans le store pour suivre la décision prise. */
  protected readonly plan = computed(() => this.store.plans().find((p) => p.id === this.planId));
  private readonly owner = computed(() =>
    this.settings.users.items().find((u) => u.id === this.plan()?.userId),
  );
  protected readonly name = computed(() => {
    const user = this.owner();
    return user ? `${user.firstName} ${user.lastName}` : 'Collaborateur';
  });
  protected readonly subtitle = computed(() => {
    const user = this.owner();
    return `${user ? POSTE_LABEL[user.poste] : ''} · Planning ${this.plan()?.year ?? ''}`;
  });
  protected readonly statusView = computed(() => {
    const plan = this.plan();
    return planStatusView(plan ?? { status: 'BROUILLON' });
  });
  protected readonly formatPeriod = formatPeriod;
  protected readonly summary = computed(() => summarize(this.plan()?.lines ?? []));

  protected activityLabel(id: string): string {
    return this.settings.activityLabel(id);
  }

  protected approve(): void {
    const plan = this.plan();
    if (plan) {
      this.store.decide(plan, { approve: true }, () => this.ref.close());
    }
  }

  protected reject(): void {
    const plan = this.plan();
    if (plan) {
      this.store.decide(plan, { approve: false, reason: this.reason().trim() }, () =>
        this.ref.close(),
      );
    }
  }
}
