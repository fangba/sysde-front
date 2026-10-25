import { Injectable, computed, inject, signal } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { toApiError } from '@core/http/api-error';
import { NotificationService } from '@core/notifications/notification.service';
import { ToastService } from '@core/notifications/toast.service';
import { uniqueId } from '@shared/util/ids';

import { ACTIVITY_CATEGORIES } from '../../settings/data/settings.constants';
import type { Activity, ActivityCategory, User } from '../../settings/data/settings.models';
import { SettingsStore } from '../../settings/state/settings.store';
import { PlanningApi } from '../data/planning.api';
import type {
  ActivitySubmission,
  AnnualPlan,
  PlanLine,
  PlanLineInput,
} from '../data/planning.models';
import {
  checkFrequency,
  checkMessage,
  isActivityLocked,
  isEditable,
  annualOverview,
  objectives,
  sortLines,
  submissionOf,
  summarize,
  validateLine,
  type FrequencyCheck,
} from '../data/planning.rules';

const LOCKED_MESSAGE =
  "Cette activité a été soumise : ses dates ne sont plus modifiables tant que le chef secteur n'a pas décidé.";
const ALERT_DURATION_MS = 8000;

export type PlanLoadStatus = 'loading' | 'ready' | 'error';

/** État d'une activité : « à vérifier » tant que ses dates n'ont pas été contrôlées (ou ont changé). */
export type ActivityCheckState = 'TO_CHECK' | 'OK' | 'KO';

interface StoredCheck {
  readonly check: FrequencyCheck;
  /** Dates et paramètres de l'activité au moment du contrôle, pour détecter un changement. */
  readonly signature: string;
}

/** Planning annuel de l'utilisateur connecté : brouillon local, enregistrement, soumission. */
@Injectable()
export class PlanningStore {
  private readonly api = inject(PlanningApi);
  private readonly toast = inject(ToastService);
  private readonly settings = inject(SettingsStore);
  private readonly currentUser = inject(CurrentUser);
  private readonly notifications = inject(NotificationService);

  /**
   * Collaborateur dont la secrétaire saisit le planning à sa place ; `null` pour son propre
   * planning. Tant qu'il est défini, `load`, `save` et `submit` agissent sur son planning.
   */
  readonly target = signal<User | null>(null);
  readonly proxy = computed(() => this.target() !== null);
  /** Poste du titulaire du planning (le collaborateur ciblé, sinon l'utilisateur connecté). */
  readonly ownerPoste = computed(() => this.target()?.poste ?? this.currentUser.user().poste);
  /** Le titulaire est chef secteur : son planning est validé d'office. */
  readonly ownerIsSectorHead = computed(() =>
    this.proxy() ? this.target()?.poste === 'CS' : this.currentUser.isSectorHead(),
  );

  readonly year = signal(new Date().getFullYear());
  readonly plan = signal<AnnualPlan | null>(null);
  readonly draft = signal<readonly PlanLine[]>([]);
  readonly status = signal<PlanLoadStatus>('loading');
  readonly error = signal('');
  readonly saving = signal(false);
  private readonly results = signal<Readonly<Record<string, StoredCheck>>>({});

  /** Activités que le poste de l'utilisateur peut inscrire à son planning (actives seulement). */
  readonly activities = computed<readonly Activity[]>(() => {
    const poste = this.ownerPoste();
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
  /** Le chef secteur n'a pas de validateur : seuls les autres postes soumettent une activité. */
  readonly canSubmitActivities = computed(
    () => !this.currentUser.isSectorHead() && !this.proxy() && this.editable(),
  );

  /** Soumission propre à une activité (soumise, validée ou rejetée), si elle en a une. */
  submissionOf(activityId: string): ActivitySubmission | undefined {
    return submissionOf(this.plan(), activityId);
  }
  /** Les dates de l'activité ne se modifient plus (planning ou activité soumis, ou validés). */
  isLocked(activityId: string): boolean {
    return isActivityLocked(this.plan(), activityId);
  }

  readonly summary = computed(() => summarize(this.draft()));
  /** Séances prévues face aux objectifs annuels des activités du poste. */
  readonly objectives = computed(() => objectives(this.activities(), this.draft()));
  /** Toutes les activités à fréquence, avec leur état (bilan annuel de l'Élaboration). */
  readonly overview = computed(() => annualOverview(this.activities(), this.draft()));
  /** Séances programmées d'une activité dans le brouillon, par date. */
  datesOf(activityId: string): readonly PlanLine[] {
    return this.draft()
      .filter((l) => l.activityId === activityId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private signatureOf(activity: Activity): string {
    const dates = this.datesOf(activity.id)
      .map((l) => `${l.date}~${l.endDate}`)
      .join(';');
    return `${this.year()}|${JSON.stringify(activity.frequency)}|${activity.durationDays}|${dates}`;
  }

  /** Dernier contrôle de l'activité, s'il est encore valable (dates inchangées depuis). */
  checkOf(activityId: string): FrequencyCheck | null {
    const stored = this.results()[activityId];
    const activity = this.activities().find((a) => a.id === activityId);
    return stored && activity && stored.signature === this.signatureOf(activity)
      ? stored.check
      : null;
  }

  /** État de chaque activité du poste : à vérifier, cohérente (actif) ou non (inactif). */
  readonly checkStates = computed<Readonly<Record<string, ActivityCheckState>>>(() => {
    const states: Record<string, ActivityCheckState> = {};
    for (const activity of this.activities()) {
      const check = this.checkOf(activity.id);
      states[activity.id] = check === null ? 'TO_CHECK' : check.ok ? 'OK' : 'KO';
    }
    return states;
  });

  /** Contrôle les dates d'une activité face à sa fréquence et mémorise le résultat. */
  verify(activityId: string): FrequencyCheck | null {
    const activity = this.activities().find((a) => a.id === activityId);
    if (!activity) {
      return null;
    }
    const check = checkFrequency(activity, this.datesOf(activityId));
    const stored: StoredCheck = { check, signature: this.signatureOf(activity) };
    this.results.update((all) => ({ ...all, [activityId]: stored }));
    return check;
  }

  /** Contrôle d'un coup toutes les activités du poste. */
  verifyAll(): readonly { readonly activity: Activity; readonly check: FrequencyCheck }[] {
    return this.activities().flatMap((activity) => {
      const check = this.verify(activity.id);
      return check ? [{ activity, check }] : [];
    });
  }

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
          (line.plantation ?? '') !== (other.plantation ?? '') ||
          line.hours !== other.hours
        );
      })
    );
  });

  load(year = this.year()): void {
    this.year.set(year);
    this.results.set({});
    this.status.set('loading');
    this.api.mine(year, this.target()?.id).subscribe({
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
    const before = id ? this.draft().find((l) => l.id === id) : undefined;
    if (this.isLocked(input.activityId) || (before && this.isLocked(before.activityId))) {
      return LOCKED_MESSAGE;
    }
    const plantation = input.plantation?.trim();
    const line: PlanLine = {
      ...input,
      place: input.place.trim(),
      plantation: plantation || undefined,
      id: id ?? uniqueId('brouillon'),
    };
    this.draft.update((lines) =>
      sortLines(id ? lines.map((l) => (l.id === id ? line : l)) : [...lines, line]),
    );
    return null;
  }

  removeLine(id: string): string | null {
    const line = this.draft().find((l) => l.id === id);
    if (line && this.isLocked(line.activityId)) {
      return LOCKED_MESSAGE;
    }
    this.draft.update((lines) => lines.filter((l) => l.id !== id));
    return null;
  }

  /** Reprend les lignes d'un fichier : elles remplacent ou complètent le brouillon. */
  importLines(lines: readonly PlanLineInput[], mode: 'replace' | 'append'): string | null {
    // Remplacer ne touche pas aux dates des activités déjà soumises ou validées.
    const base: readonly PlanLine[] =
      mode === 'replace' ? this.draft().filter((l) => this.isLocked(l.activityId)) : this.draft();
    const merged: PlanLine[] = [...base];
    for (const input of lines) {
      if (this.isLocked(input.activityId)) {
        return LOCKED_MESSAGE;
      }
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
    this.api.saveLines(this.year(), this.draft(), this.target()?.id).subscribe({
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
    const owner = this.target();
    this.api.saveLines(this.year(), this.draft(), owner?.id).subscribe({
      next: (saved) => {
        this.apply(saved);
        this.api.submit(this.year(), owner?.id).subscribe({
          next: (plan) => {
            this.apply(plan);
            this.saving.set(false);
            const name = owner ? `${owner.firstName} ${owner.lastName}` : '';
            this.toast.show(
              owner
                ? plan.status === 'VALIDE'
                  ? `Le planning de ${name} est validé.`
                  : `Le planning de ${name} a été soumis au chef secteur.`
                : plan.status === 'VALIDE'
                  ? 'Votre planning est validé.'
                  : 'Votre planning a été soumis au chef secteur.',
              'success',
            );
            if (owner) {
              this.notifications.notify(
                owner.email,
                plan.status === 'VALIDE' ? 'Planning validé' : 'Planning soumis',
                plan.status === 'VALIDE'
                  ? `Votre planning ${plan.year} a été saisi et validé par la secrétaire.`
                  : `Votre planning ${plan.year} a été saisi par la secrétaire et soumis au chef secteur.`,
                'info',
              );
            }
          },
          error: (error: unknown) => this.fail(error),
        });
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  /**
   * Enregistre le brouillon puis soumet une seule activité au chef secteur. Les dates doivent être
   * cohérentes avec la fréquence : sinon l'activité reste en brouillon et l'alerte est affichée.
   */
  submitActivity(activityId: string): void {
    const activity = this.activities().find((a) => a.id === activityId);
    if (!activity || this.saving() || !this.editable() || this.isLocked(activityId)) {
      return;
    }
    const check = this.verify(activityId);
    if (check && !check.ok) {
      this.toast.show(checkMessage(activity, check).text, 'warning', ALERT_DURATION_MS);
      return;
    }
    this.saving.set(true);
    this.api.saveLines(this.year(), this.draft()).subscribe({
      next: (saved) => {
        this.apply(saved);
        this.api.submitActivity(this.year(), activityId).subscribe({
          next: (plan) => {
            this.apply(plan);
            this.saving.set(false);
            this.toast.show(
              `L'activité « ${activity.label} » a été soumise au chef secteur.`,
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
