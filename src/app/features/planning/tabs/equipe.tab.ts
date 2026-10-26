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
import { RouterLink } from '@angular/router';

import { ToastService } from '@core/notifications/toast.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PaginationComponent } from '@shared/ui/pagination/pagination.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { formatDate } from '@shared/util/format';

import { POSTE_LABEL } from '../../settings/data/settings.constants';
import type { Poste } from '../../settings/data/settings.models';
import { SettingsStore } from '../../settings/state/settings.store';
import { downloadTeamTemplate, readPlanFile } from '../data/planning.excel';
import { parseTeamRows, rosterStatusOf, type RosterStatus } from '../data/planning.rules';
import type { AnnualPlan } from '../data/planning.models';
import { ROSTER_STATUS, ROSTER_STATUS_ORDER } from '../data/roster';
import { PlanningStore } from '../state/planning.store';
import { ReviewStore } from '../state/review.store';
import { TeamImportDialog, type TeamImportChoice, type TeamImportData } from './team-import.dialog';

interface RosterRow {
  readonly userId: string;
  readonly plan: AnnualPlan;
  readonly name: string;
  readonly initials: string;
  readonly matricule: string;
  readonly poste: Poste;
  readonly status: RosterStatus;
  readonly done: number;
  readonly total: number;
  readonly last: string;
}

const STATUS = ROSTER_STATUS;
const STATUS_ORDER = ROSTER_STATUS_ORDER;
const POSTE_ORDER: readonly Poste[] = ['MO', 'CO', 'CF', 'FS', 'ES', 'CS'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Équipe du secteur pour la secrétaire : état de chaque planning, saisie et import à leur place. */
@Component({
  selector: 'sysde-equipe-tab',
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    FormsModule,
    IconComponent,
    PaginationComponent,
    RouterLink,
    StatusPillComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './equipe.tab.html',
  styleUrl: './equipe.tab.scss',
})
export class EquipeTab {
  protected readonly store = inject(ReviewStore);
  protected readonly mine = inject(PlanningStore);
  private readonly settings = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly toast = inject(ToastService);

  protected readonly statuses = STATUS;
  protected readonly search = signal('');
  protected readonly filter = signal<'ALL' | RosterStatus>('ALL');
  protected readonly poste = signal<'ALL' | Poste>('ALL');
  protected readonly page = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly downloading = signal(false);

  protected readonly rows = computed<readonly RosterRow[]>(() =>
    this.store
      .plans()
      .flatMap((plan) => {
        const user = this.store.userOf(plan);
        if (!user) {
          return [];
        }
        const activities = this.settings.activities
          .items()
          .filter((a) => a.active && a.poste === user.poste);
        const done = new Set(plan.lines.map((l) => l.activityId)).size;
        return [
          {
            userId: user.id,
            plan,
            name: `${user.lastName} ${user.firstName}`,
            initials: `${user.lastName.charAt(0)}${user.firstName.charAt(0)}`.toUpperCase(),
            matricule: user.matricule ?? '',
            poste: user.poste,
            status: rosterStatusOf(plan),
            done,
            total: Math.max(activities.length, done),
            last: lastEdit(plan),
          },
        ];
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  );

  protected readonly statusChips = computed(() => [
    { code: 'ALL' as const, label: 'Tous', count: this.rows().length },
    ...STATUS_ORDER.map((code) => ({
      code,
      label: STATUS[code].label,
      count: this.rows().filter((r) => r.status === code).length,
    })),
  ]);
  protected readonly posteChips = computed(() => [
    { code: 'ALL' as const, label: 'Tous les postes', count: this.rows().length },
    ...POSTE_ORDER.filter((p) => this.rows().some((r) => r.poste === p)).map((code) => ({
      code,
      label: code as string,
      count: this.rows().filter((r) => r.poste === code).length,
    })),
  ]);

  private readonly filtered = computed(() => {
    const text = this.search().trim().toLowerCase();
    return this.rows().filter(
      (r) =>
        (this.filter() === 'ALL' || r.status === this.filter()) &&
        (this.poste() === 'ALL' || r.poste === this.poste()) &&
        (!text || `${r.name} ${r.matricule}`.toLowerCase().includes(text)),
    );
  });
  protected readonly shown = computed(() => {
    const size = this.pageSize();
    const last = Math.max(0, Math.ceil(this.filtered().length / size) - 1);
    const from = Math.min(this.page(), last) * size;
    return this.filtered().slice(from, from + size);
  });

  protected readonly posteLabel = (code: Poste) => POSTE_LABEL[code];

  constructor() {
    // Recharge à l'ouverture et à chaque changement d'année.
    effect(() => {
      this.mine.year();
      untracked(() => this.store.load());
    });
  }

  protected setFilter(code: 'ALL' | RosterStatus): void {
    this.filter.set(code);
    this.page.set(0);
  }
  protected setPoste(code: 'ALL' | Poste): void {
    this.poste.set(code);
    this.page.set(0);
  }
  protected setSearch(text: string): void {
    this.search.set(text);
    this.page.set(0);
  }

  protected async downloadTemplate(): Promise<void> {
    this.downloading.set(true);
    try {
      await downloadTeamTemplate(this.mine.year(), this.store.members());
    } catch {
      this.toast.show("Le modèle n'a pas pu être généré. Réessayez.", 'error');
    } finally {
      this.downloading.set(false);
    }
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.toast.show('Choisissez un fichier Excel au format .xlsx.', 'error');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.toast.show('Le fichier dépasse 5 Mo.', 'error');
      return;
    }
    try {
      const result = parseTeamRows(
        await readPlanFile(file),
        this.mine.year(),
        this.store.members(),
      );
      const plans = new Map(this.store.plans().map((p) => [p.userId, p]));
      const data: TeamImportData = {
        fileName: file.name,
        result,
        locked: new Set(
          result.people
            .filter((p) => plans.get(p.member.userId)?.status !== 'BROUILLON')
            .map((p) => p.member.userId),
        ),
        withDraft: new Set(
          result.people
            .filter((p) => (plans.get(p.member.userId)?.lines.length ?? 0) > 0)
            .map((p) => p.member.userId),
        ),
      };
      this.dialog
        .open<TeamImportChoice>(TeamImportDialog, {
          data,
          injector: this.injector,
          panelClass: 'ui-dialog-panel',
          width: 'min(640px, calc(100vw - 32px))',
          backdropClass: 'ui-dialog-backdrop',
        })
        .closed.subscribe((choice) => {
          if (choice) {
            this.store.importMany(choice.people, choice.mode, () => undefined);
          }
        });
    } catch {
      this.toast.show(
        "Ce fichier n'a pas pu être lu. Utilisez le modèle Excel de l'équipe au format .xlsx.",
        'error',
      );
    }
  }
}

function lastEdit(plan: AnnualPlan): string {
  if (!plan.editedAt) {
    return '—';
  }
  return `${plan.editedBy === 'SECRETARY' ? 'Vous' : 'Lui-même'} · ${formatDate(plan.editedAt).slice(0, 5)}`;
}
