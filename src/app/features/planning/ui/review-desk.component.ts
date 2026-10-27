import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

import { POSTE_LABEL } from '../../settings/data/settings.constants';
import type { Poste } from '../../settings/data/settings.models';
import { frequencyLabel } from '../../settings/data/settings.rules';
import { SettingsStore } from '../../settings/state/settings.store';
import { summarize } from '../data/planning.rules';
import { PlanningStore } from '../state/planning.store';
import { ReviewStore, type ActivityAssessment, type ReviewItem } from '../state/review.store';
import { ActivityReviewDialog } from '../tabs/activity-review.dialog';
import { BulkApproveDialog } from '../tabs/bulk-approve.dialog';
import { PlanReviewDialog } from '../tabs/review.dialog';

/** Une ligne de la file de validation : l'élément, son auteur et son contrôle automatique. */
interface DeskRow {
  readonly item: ReviewItem;
  readonly name: string;
  readonly initials: string;
  readonly matricule: string;
  readonly poste: Poste;
  readonly posteLabel: string;
  readonly activities: readonly ActivityAssessment[];
  readonly ready: boolean;
  /** Première anomalie, pour la voie « À examiner ». */
  readonly issue: string;
  /** Ce que contient l'élément, pour la voie « Prêts à valider ». */
  readonly content: string;
}

interface MonthCell {
  readonly count: number;
  readonly bad: boolean;
}

interface ActivityCard {
  readonly id: string;
  readonly label: string;
  readonly frequency: string;
  readonly ok: boolean;
  readonly issues: readonly string[];
  readonly sessions: number;
  readonly months: readonly MonthCell[];
}

/** Ordre d'affichage des postes dans les filtres. */
const POSTE_ORDER: readonly Poste[] = ['MO', 'CO', 'CF', 'FS', 'ES'];
const MIN_REASON = 5;
const REVIEW_PAGE = 5;
const READY_PAGE = 8;

/**
 * Poste de validation du chef secteur : deux voies — « À examiner » (anomalie de fréquence) et
 * « Prêts à valider » (aucune anomalie, validation en lot possible) — et un aperçu de l'élément
 * ciblé pour décider sans ouvrir chaque planning.
 */
@Component({
  selector: 'sysde-review-desk',
  imports: [ButtonComponent, EmptyStateComponent, FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-desk.component.html',
  styleUrl: './review-desk.component.scss',
})
export class ReviewDesk {
  protected readonly store = inject(ReviewStore);
  protected readonly mine = inject(PlanningStore);
  private readonly settings = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  protected readonly MIN_REASON = MIN_REASON;
  protected readonly monthLetters = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  protected readonly search = signal('');
  protected readonly poste = signal<'ALL' | Poste>('ALL');
  private readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  private readonly focusId = signal<string | null>(null);
  protected readonly rejecting = signal(false);
  protected readonly reason = signal('');
  protected readonly reviewLimit = signal(REVIEW_PAGE);
  protected readonly readyLimit = signal(READY_PAGE);

  /** Tous les éléments à décider, avec leur contrôle automatique. */
  protected readonly all = computed<readonly DeskRow[]>(() =>
    this.store.items().map((item) => this.toRow(item)),
  );

  protected readonly chips = computed(() => {
    const all = this.all();
    const present = POSTE_ORDER.filter((p) => all.some((r) => r.poste === p));
    return [
      { code: 'ALL' as const, label: 'Tous', title: 'Tous les postes', count: all.length },
      ...present.map((p) => ({
        code: p,
        label: p as string,
        title: POSTE_LABEL[p],
        count: all.filter((r) => r.poste === p).length,
      })),
    ];
  });

  private readonly filtered = computed<readonly DeskRow[]>(() => {
    const text = this.search().trim().toLowerCase();
    const poste = this.poste();
    return this.all().filter(
      (r) =>
        (poste === 'ALL' || r.poste === poste) &&
        (!text || `${r.name} ${r.matricule}`.toLowerCase().includes(text)),
    );
  });

  protected readonly review = computed(() => this.filtered().filter((r) => !r.ready));
  protected readonly ready = computed(() => this.filtered().filter((r) => r.ready));
  protected readonly reviewShown = computed(() => this.review().slice(0, this.reviewLimit()));
  protected readonly readyShown = computed(() => this.ready().slice(0, this.readyLimit()));

  /** L'élément affiché dans l'aperçu : celui qu'on a choisi, sinon le premier à examiner. */
  protected readonly current = computed<DeskRow | null>(() => {
    const id = this.focusId();
    return (
      this.filtered().find((r) => r.item.id === id) ?? this.review()[0] ?? this.ready()[0] ?? null
    );
  });

  /** Voie de l'élément affiché et sa position, pour « précédent / suivant ». */
  protected readonly lane = computed(() => {
    const current = this.current();
    if (!current) {
      return { rows: [] as readonly DeskRow[], index: -1, label: '' };
    }
    const rows = current.ready ? this.ready() : this.review();
    return {
      rows,
      index: rows.findIndex((r) => r.item.id === current.item.id),
      label: current.ready ? 'prêts à valider' : 'à examiner',
    };
  });

  protected readonly cards = computed<readonly ActivityCard[]>(() => {
    const current = this.current();
    if (!current) {
      return [];
    }
    return current.activities
      .filter((a) => current.item.kind === 'ACTIVITY' || a.lines.length > 0 || !a.ok)
      .map((a) => this.toCard(a));
  });

  protected readonly kpis = computed(() => {
    const current = this.current();
    if (!current) {
      return [];
    }
    const lines = current.activities.flatMap((a) => a.lines);
    const total = summarize(lines);
    return [
      {
        value: String(current.activities.filter((a) => a.lines.length > 0).length),
        label: 'Activités',
      },
      { value: String(total.days), label: 'Jours' },
    ];
  });

  /** Éléments prêts cochés pour la validation en lot. */
  protected readonly selected = computed<readonly DeskRow[]>(() => {
    const ids = this.selectedIds();
    return this.ready().filter((r) => ids.has(r.item.id));
  });
  protected readonly allSelected = computed(
    () => this.ready().length > 0 && this.selected().length === this.ready().length,
  );

  constructor() {
    // Un autre élément ciblé ou une autre sélection de filtre referme la saisie du motif.
    effect(() => {
      this.current();
      untracked(() => {
        this.rejecting.set(false);
        this.reason.set('');
      });
    });
  }

  private toRow(item: ReviewItem): DeskRow {
    const user = this.store.userOf(item.plan);
    const assessment = this.store.assessments().get(item.id);
    const activities = assessment?.activities ?? [];
    const name = user ? `${user.lastName} ${user.firstName}` : '—';
    const failed = activities.find((a) => !a.ok);
    const lines = activities.flatMap((a) => a.lines);
    const total = summarize(lines);
    const used = activities.filter((a) => a.lines.length > 0).length;
    return {
      item,
      name,
      initials: user ? `${user.lastName.charAt(0)}${user.firstName.charAt(0)}`.toUpperCase() : '?',
      matricule: user?.matricule ?? '',
      poste: user?.poste ?? 'MO',
      posteLabel: user ? POSTE_LABEL[user.poste] : '',
      activities,
      ready: assessment?.ready ?? false,
      issue: failed ? `${failed.label} : ${failed.issues[0] ?? 'dates à revoir.'}` : '',
      content:
        item.kind === 'ACTIVITY'
          ? `Activité « ${activities[0]?.label ?? ''} » · ${lines.length} date${lines.length > 1 ? 's' : ''}`
          : `Planning · ${used} activité${used > 1 ? 's' : ''} · ${total.days} jour${total.days > 1 ? 's' : ''}`,
    };
  }

  private toCard(a: ActivityAssessment): ActivityCard {
    const counts = Array.from({ length: 12 }, () => 0);
    for (const line of a.lines) {
      counts[Number(line.date.slice(5, 7)) - 1]!++;
    }
    const activity = this.settings.activityOf(a.activityId);
    const expectedPerMonth =
      activity?.frequency?.period === 'MONTH' ? activity.frequency.count : null;
    return {
      id: a.activityId,
      label: a.label,
      frequency: activity ? frequencyLabel(activity) : '',
      ok: a.ok,
      issues: a.issues,
      sessions: a.lines.length,
      months: counts.map((count) => ({
        count,
        bad: !a.ok && expectedPerMonth !== null && count !== expectedPerMonth,
      })),
    };
  }

  protected shortPoste(row: DeskRow): string {
    return row.poste;
  }

  protected focus(row: DeskRow): void {
    this.focusId.set(row.item.id);
  }

  protected step(delta: number): void {
    const { rows, index } = this.lane();
    const next = rows[index + delta];
    if (next) {
      this.focusId.set(next.item.id);
    }
  }

  protected toggle(row: DeskRow): void {
    this.selectedIds.update((ids) => {
      const next = new Set(ids);
      if (!next.delete(row.item.id)) {
        next.add(row.item.id);
      }
      return next;
    });
  }

  protected toggleAll(): void {
    this.selectedIds.set(
      this.allSelected() ? new Set() : new Set(this.ready().map((r) => r.item.id)),
    );
  }

  protected isSelected(row: DeskRow): boolean {
    return this.selectedIds().has(row.item.id);
  }

  protected approveSelection(): void {
    const items = this.selected().map((r) => r.item);
    if (items.length === 0) {
      return;
    }
    this.dialog.open(BulkApproveDialog, {
      data: { ids: items.map((i) => i.id) },
      injector: this.injector,
      panelClass: 'ui-dialog-panel',
      width: 'min(560px, calc(100vw - 32px))',
      backdropClass: 'ui-dialog-backdrop',
    });
  }

  /** Valide ou rejette l'élément affiché, puis passe au suivant de la même voie. */
  protected decide(approve: boolean): void {
    const current = this.current();
    if (!current) {
      return;
    }
    const { rows, index } = this.lane();
    const after = rows[index + 1] ?? rows[index - 1] ?? null;
    const decision = approve
      ? ({ approve: true } as const)
      : ({ approve: false, reason: this.reason().trim() } as const);
    const done = () => this.focusId.set(after?.item.id ?? null);
    const { item } = current;
    if (item.kind === 'PLAN') {
      this.store.decide(item.plan, decision, done);
    } else {
      this.store.decideActivity(item.plan, item.activityId!, decision, done);
    }
  }

  protected openDetail(): void {
    const current = this.current();
    if (!current) {
      return;
    }
    const { item } = current;
    const base = {
      injector: this.injector,
      panelClass: 'ui-drawer-panel',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
    };
    if (item.kind === 'PLAN') {
      this.dialog.open(PlanReviewDialog, {
        ...base,
        data: { planId: item.plan.id, readOnly: false },
        width: 'min(760px, 100vw)',
      });
    } else {
      this.dialog.open(ActivityReviewDialog, {
        ...base,
        data: { planId: item.plan.id, activityId: item.activityId, readOnly: false },
        width: 'min(640px, 100vw)',
      });
    }
  }
}
