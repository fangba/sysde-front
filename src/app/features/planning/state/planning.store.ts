import { Injectable, computed, inject, signal } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { toApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { uniqueId } from '@shared/util/ids';

import { ACTIVITY_CATEGORIES } from '../../settings/data/settings.constants';
import type { Activity, ActivityCategory } from '../../settings/data/settings.models';
import { SettingsStore } from '../../settings/state/settings.store';
import { PlanningApi } from '../data/planning.api';
import type { AnnualPlan, PlanLine, PlanLineInput } from '../data/planning.models';
import { isEditable, objectives, sortLines, summarize, validateLine } from '../data/planning.rules';

export type PlanLoadStatus = 'loading' | 'ready' | 'error';

/** Planning annuel de l'utilisateur connecté : brouillon local, enregistrement, soumission. */
@Injectable()
export class PlanningStore {
  private readonly api = inject(PlanningApi);
  private readonly toast = inject(ToastService);
  private readonly settings = inject(SettingsStore);
  private readonly currentUser = inject(CurrentUser);

  readonly year = signal(new Date().getFullYear());
  readonly plan = signal<AnnualPlan | null>(null);
  readonly draft = signal<readonly PlanLine[]>([]);
  readonly status = signal<PlanLoadStatus>('loading');
  readonly error = signal('');
  readonly saving = signal(false);

  /** Activités que le poste de l'utilisateur peut inscrire à son planning (actives seulement). */
  readonly activities = computed<readonly Activity[]>(() => {
    const poste = this.currentUser.user().poste;
    return this.settings.activities
      .items()
      .filter((a) => a.poste === poste && a.active)
      .sort(
        (a, b) =>
          ACTIVITY_CATEGORIES.findIndex((c) => c.code === a.category) -
          ACTIVITY_CATEGORIES.findIndex((c) => c.code === b.category),
      );
  });
  private readonly allowed = computed(() => new Set(this.activities().map((a) => a.id)));

  activityLabel(id: string): string {
    return this.settings.activityLabel(id);
  }

  categoryOf(id: string): ActivityCategory | undefined {
    return this.settings.activityOf(id)?.category;
  }

  /** Catégorie d'une activité (« Formation »…), vide si l'activité est inconnue. */
  categoryLabel(id: string): string {
    const category = this.settings.activityOf(id)?.category;
    return ACTIVITY_CATEGORIES.find((c) => c.code === category)?.label ?? '';
  }

  readonly editable = computed(() => {
    const plan = this.plan();
    return plan !== null && isEditable(plan.status);
  });
  readonly summary = computed(() => summarize(this.draft()));
  /** Séances prévues face aux objectifs annuels des activités du poste. */
  readonly objectives = computed(() => objectives(this.activities(), this.draft()));
  /** Durée par défaut d'une séance de l'activité, en jours. */
  durationOf(id: string): number {
    return this.settings.activityOf(id)?.durationDays ?? 1;
  }
  /** Des modifications n'ont pas encore été enregistrées. */
  readonly dirty = computed(() => {
    const saved = this.plan()?.lines ?? [];
    const draft = this.draft();
    return (
      saved.length !== draft.length ||
      saved.some((line, i) => {
        const other = draft[i]!;
        return (
          line.date !== other.date ||
          line.endDate !== other.endDate ||
          line.activityId !== other.activityId ||
          line.place !== other.place ||
          line.hours !== other.hours
        );
      })
    );
  });

  load(year = this.year()): void {
    this.year.set(year);
    this.status.set('loading');
    this.api.mine(year).subscribe({
      next: (plan) => {
        this.apply(plan);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.error.set(toApiError(error).message);
        this.status.set('error');
      },
    });
  }

  /** Ajoute (`id` nul) ou modifie une ligne du brouillon. Renvoie le message d'erreur, sinon `null`. */
  upsertLine(id: string | null, input: PlanLineInput): string | null {
    const message = validateLine(input, this.year(), this.draft(), id ?? undefined, this.allowed());
    if (message) {
      return message;
    }
    const line: PlanLine = { ...input, place: input.place.trim(), id: id ?? uniqueId('brouillon') };
    this.draft.update((lines) =>
      sortLines(id ? lines.map((l) => (l.id === id ? line : l)) : [...lines, line]),
    );
    return null;
  }

  removeLine(id: string): void {
    this.draft.update((lines) => lines.filter((l) => l.id !== id));
  }

  /** Reprend les lignes d'un fichier : elles remplacent ou complètent le brouillon. */
  importLines(lines: readonly PlanLineInput[], mode: 'replace' | 'append'): string | null {
    const base: readonly PlanLine[] = mode === 'replace' ? [] : this.draft();
    const merged: PlanLine[] = [...base];
    for (const input of lines) {
      const message = validateLine(input, this.year(), merged, undefined, this.allowed());
      if (message) {
        return message;
      }
      merged.push({ ...input, id: uniqueId('brouillon') });
    }
    this.draft.set(sortLines(merged));
    return null;
  }

  discard(): void {
    this.draft.set(this.plan()?.lines ?? []);
  }

  save(onDone?: () => void): void {
    if (this.saving() || !this.editable()) {
      return;
    }
    this.saving.set(true);
    this.api.saveLines(this.year(), this.draft()).subscribe({
      next: (plan) => {
        this.apply(plan);
        this.saving.set(false);
        this.toast.show('Le planning a été enregistré.', 'success');
        onDone?.();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  /** Enregistre le brouillon puis le soumet. */
  submit(): void {
    if (this.saving() || !this.editable()) {
      return;
    }
    this.saving.set(true);
    this.api.saveLines(this.year(), this.draft()).subscribe({
      next: (saved) => {
        this.apply(saved);
        this.api.submit(this.year()).subscribe({
          next: (plan) => {
            this.apply(plan);
            this.saving.set(false);
            this.toast.show(
              plan.status === 'VALIDE'
                ? 'Votre planning est validé.'
                : 'Votre planning a été soumis au chef secteur.',
              'success',
            );
          },
          error: (error: unknown) => this.fail(error),
        });
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  private apply(plan: AnnualPlan): void {
    this.plan.set(plan);
    this.draft.set(plan.lines);
  }

  private fail(error: unknown): void {
    this.saving.set(false);
    this.toast.show(toApiError(error).message, 'error');
  }
}
