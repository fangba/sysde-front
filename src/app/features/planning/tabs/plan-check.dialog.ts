import { DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog-shell/dialog-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

import { checkAllMessage, type FrequencyCheck } from '../data/planning.rules';
import { PlanningStore } from '../state/planning.store';

interface CheckResult {
  readonly activity: { readonly label: string };
  readonly check: FrequencyCheck;
}

type StepState = 'waiting' | 'running' | 'ok' | 'ko';

interface Step {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
  /** Résultat affiché sous l'étape une fois contrôlée. */
  readonly detail: string;
}

/** Durée minimale d'une étape, pour que la progression reste lisible. */
const STEP_MS = 450;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Contrôle du planning : chaque activité est vérifiée face à sa fréquence, l'une après l'autre,
 * avec une barre de progression et la liste des étapes.
 */
@Component({
  selector: 'sysde-plan-check-dialog',
  imports: [ButtonComponent, DialogShellComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-shell title="Vérification du planning" [subtitle]="subtitle()">
      <div class="bar-head">
        <strong>{{ headline() }}</strong>
        <span class="pct">{{ percent() }} %</span>
      </div>
      <div
        class="bar"
        [class.done]="finished()"
        [class.bad]="finished() && failed() > 0"
        role="progressbar"
        aria-label="Progression de la vérification"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-valuenow]="percent()"
      >
        <span class="fill" [style.width.%]="percent()"></span>
      </div>

      <ol class="steps">
        @for (step of steps(); track step.id) {
          <li [class]="'step ' + step.state">
            <span class="mark" aria-hidden="true">
              @switch (step.state) {
                @case ('ok') {
                  <ui-icon name="check" />
                }
                @case ('ko') {
                  <ui-icon name="alert" />
                }
                @case ('running') {
                  <i class="spin"></i>
                }
                @default {
                  <i class="dot"></i>
                }
              }
            </span>
            <span class="what">
              <strong>{{ step.label }}</strong>
              @if (step.detail) {
                <span class="sub">{{ step.detail }}</span>
              }
            </span>
          </li>
        }
      </ol>

      @if (finished()) {
        <p class="summary" [class.bad]="failed() > 0" role="status">{{ summary() }}</p>
      }

      <div dialogActions>
        <button ui-button variant="primary" type="button" (click)="close()">
          {{ finished() ? 'Terminer' : 'Annuler' }}
        </button>
      </div>
    </ui-dialog-shell>
  `,
  styles: `
    .bar-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .pct {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--green-700);
    }
    .bar {
      position: relative;
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--green-100);
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--action-from), var(--action-to));
      transition: width 380ms var(--ease);
    }
    .bar:not(.done) .fill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent,
        color-mix(in srgb, white 45%, transparent),
        transparent
      );
      transform: translateX(-100%);
      animation: sheen 1.2s linear infinite;
    }
    .bar.bad .fill {
      background: var(--amber-700);
    }
    @keyframes sheen {
      to {
        transform: translateX(100%);
      }
    }
    .steps {
      display: grid;
      gap: 4px;
      margin: 18px 0 0;
      padding: 0;
      list-style: none;
      max-height: 46vh;
      overflow-y: auto;
    }
    .step {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 9px 10px;
      border-radius: var(--radius-md);
      color: var(--ink-500);
      transition:
        background var(--duration) var(--ease),
        color var(--duration) var(--ease);
    }
    .step.running {
      background: var(--green-50);
      color: var(--ink-900);
    }
    .step.ok {
      color: var(--ink-900);
    }
    .step.ko {
      background: var(--amber-100);
      color: var(--ink-900);
    }
    .mark {
      display: grid;
      place-items: center;
      flex: none;
      width: 22px;
      height: 22px;
      margin-top: 1px;
      border-radius: 50%;
      background: var(--neutral-100);
      color: var(--neutral-700);
    }
    .step.ok .mark {
      background: var(--ok-100);
      color: var(--ok-700);
    }
    .step.ko .mark {
      background: var(--amber-100);
      color: var(--amber-700);
    }
    .step.running .mark {
      background: transparent;
    }
    .mark ui-icon {
      width: 14px;
      height: 14px;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ink-300);
    }
    .spin {
      width: 16px;
      height: 16px;
      border: 2px solid var(--green-100);
      border-top-color: var(--green-700);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .what {
      display: grid;
      gap: 2px;
      font-size: 14px;
      line-height: 1.4;
    }
    .sub {
      font-size: 12.5px;
      color: var(--ink-500);
    }
    .summary {
      margin: 16px 0 0;
      padding: 12px 14px;
      border-radius: var(--radius-md);
      background: var(--ok-100);
      color: var(--ok-700);
      font-size: 13px;
      font-weight: 600;
      line-height: 1.5;
    }
    .summary.bad {
      background: var(--amber-100);
      color: var(--amber-700);
    }
    @media (prefers-reduced-motion: reduce) {
      .fill {
        transition: none;
      }
      .bar .fill::after,
      .spin {
        animation: none;
      }
    }
  `,
})
export class PlanCheckDialog {
  private readonly store = inject(PlanningStore);
  private readonly ref = inject(DialogRef);

  private readonly cancelled = signal(false);

  protected readonly steps = signal<readonly Step[]>([
    { id: 'prepare', label: 'Préparation du planning', state: 'waiting', detail: '' },
    ...this.store.activities().map<Step>((a) => ({
      id: a.id,
      label: a.label,
      state: 'waiting',
      detail: '',
    })),
    { id: 'summary', label: 'Synthèse', state: 'waiting', detail: '' },
  ]);

  protected readonly finished = signal(false);
  private readonly results = signal<readonly CheckResult[]>([]);

  protected readonly failed = computed(() => this.results().filter((r) => !r.check.ok).length);
  protected readonly percent = computed(() => {
    const all = this.steps();
    const done = all.filter((s) => s.state === 'ok' || s.state === 'ko').length;
    return Math.round((done / all.length) * 100);
  });
  protected readonly headline = computed(() => {
    if (this.finished()) {
      return this.failed() === 0 ? 'Planning cohérent' : 'Anomalies détectées';
    }
    const running = this.steps().find((s) => s.state === 'running');
    return running ? `${running.label}…` : 'Démarrage…';
  });
  protected readonly subtitle = computed(() => {
    const n = this.store.activities().length;
    return `Contrôle de ${n} activité${n > 1 ? 's' : ''} face à leur fréquence`;
  });
  protected readonly summary = computed(() => checkAllMessage(this.results()).text);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelled.set(true));
    void this.run();
  }

  protected close(): void {
    this.ref.close();
  }

  private patch(id: string, state: StepState, detail = ''): void {
    this.steps.update((all) => all.map((s) => (s.id === id ? { ...s, state, detail } : s)));
  }

  private async run(): Promise<void> {
    await this.step('prepare', 'Planning chargé', () => 'ok');
    for (const activity of this.store.activities()) {
      if (this.cancelled()) {
        return;
      }
      await this.step(activity.id, '', () => {
        const check = this.store.verify(activity.id);
        if (!check) {
          return 'ok';
        }
        this.results.update((all) => [...all, { activity, check }]);
        return check.ok ? 'ok' : 'ko';
      });
    }
    await this.step('summary', '', () => 'ok');
    if (!this.cancelled()) {
      this.finished.set(true);
    }
  }

  /** Passe une étape en cours, exécute le contrôle, laisse la durée minimale puis fige le résultat. */
  private async step(id: string, okDetail: string, work: () => 'ok' | 'ko'): Promise<void> {
    if (this.cancelled()) {
      return;
    }
    this.patch(id, 'running');
    await pause(STEP_MS);
    if (this.cancelled()) {
      return;
    }
    const state = work();
    const issue = this.results().find((r) => r.activity.label === this.labelOf(id));
    const detail =
      state === 'ko'
        ? (issue?.check.issues[0] ?? 'Dates non cohérentes')
        : id === 'prepare' || id === 'summary'
          ? okDetail
          : 'Dates cohérentes';
    this.patch(id, state, detail);
  }

  private labelOf(id: string): string {
    return this.steps().find((s) => s.id === id)?.label ?? '';
  }
}
