import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { todayIso } from '@shared/util/dates';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

import { ACTIVITY_CATEGORIES } from '../../settings/data/settings.constants';
import type { ActivityCategory } from '../../settings/data/settings.models';
import {
  WEEKDAYS,
  isoOf,
  linesByDate,
  longDate,
  monthCells,
  monthName,
} from '../data/planning.calendar';
import type { PlanLine } from '../data/planning.models';
import { formatHours, formatPeriod } from '../data/planning.rules';

/** Couleur de chaque catégorie : ce sont des données, donc les teintes de séries. */
/** Mot qui numérote les séances des catégories sans plantation (les visites ont leur plantation). */
const RANK_WORD: Readonly<Partial<Record<ActivityCategory, string>>> = {
  FORMATION: 'Session',
  RENCONTRE: 'Animation',
};

const CATEGORY_COLOR: Readonly<Record<ActivityCategory, string>> = {
  FORMATION: 'var(--chart-green)',
  VISITE: 'var(--chart-violet)',
  RENCONTRE: 'var(--chart-mint)',
};

interface MonthView {
  readonly index: number;
  readonly name: string;
  readonly count: number;
  readonly cells: readonly {
    readonly day: number | null;
    readonly iso: string;
    readonly lines: readonly PlanLine[];
  }[];
}

/**
 * Calendrier annuel d'un planning : douze mois, les jours programmés sont colorés selon la
 * catégorie de leurs activités. Un jour choisi affiche ses activités.
 */
@Component({
  selector: 'sysde-plan-calendar',
  imports: [ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="legend" aria-label="Légende des catégories">
      @for (c of legend(); track c.code) {
        <li><span class="swatch" [style.background]="color(c.code)"></span>{{ c.label }}</li>
      }
    </ul>

    <div class="months">
      @for (month of months(); track month.index) {
        <section class="month" [attr.aria-label]="month.name + ' ' + year()">
          <h3>
            {{ month.name }}
            @if (month.count > 0) {
              <span class="n">{{ month.count }}</span>
            }
          </h3>
          <div class="grid">
            @for (d of weekdays; track $index) {
              <span class="wd" aria-hidden="true">{{ d }}</span>
            }
            @for (cell of month.cells; track $index) {
              @if (cell.day === null) {
                <span class="blank"></span>
              } @else {
                <button
                  type="button"
                  class="day"
                  [class.has]="cell.lines.length > 0"
                  [class.today]="cell.iso === today"
                  [class.selected]="cell.iso === selected()"
                  [style.--tint]="tint(cell.lines)"
                  [attr.tabindex]="cell.lines.length > 0 ? 0 : -1"
                  [attr.aria-pressed]="cell.iso === selected()"
                  [attr.aria-label]="dayLabel(cell.iso, cell.lines)"
                  [disabled]="cell.lines.length === 0 && !editable()"
                  (click)="select(cell.iso)"
                >
                  <span class="num">{{ cell.day }}</span>
                  @if (cell.lines.length > 0) {
                    <span class="dots" aria-hidden="true">
                      @for (line of cell.lines.slice(0, 3); track line.id) {
                        <i [style.background]="lineColor(line)"></i>
                      }
                    </span>
                  }
                </button>
              }
            }
          </div>
        </section>
      }
    </div>

    @if (selected(); as iso) {
      <section class="detail" [class.pinned]="pinDetail()" aria-live="polite">
        <header>
          <h3>{{ longDate(iso) }}</h3>
          @if (editable()) {
            <button ui-button variant="secondary" type="button" (click)="dayAdd.emit(iso)">
              <ui-icon name="plus" /> Ajouter ce jour
            </button>
          }
        </header>
        @let list = selectedLines();
        @if (list.length === 0) {
          <p class="none">Aucune activité ce jour.</p>
        } @else {
          <ul>
            @for (line of list; track line.id) {
              <li>
                <span class="swatch" [style.background]="lineColor(line)"></span>
                <span class="what">
                  <strong>{{ labelOf()(line.activityId) }}</strong>
                  <span class="sub">
                    @if (isVisit(line)) {
                      {{ line.plantation || 'Plantation non renseignée' }}
                    } @else if (rankLabel(line); as rank) {
                      {{ rank }}
                    } @else {
                      {{ line.place }} · {{ formatHours(line.hours) }} h/jour
                    }
                    @if (line.endDate !== line.date) {
                      · {{ formatPeriod(line) }}
                    }
                  </span>
                </span>
                @if (editable()) {
                  <button
                    type="button"
                    class="edit"
                    [attr.aria-label]="'Modifier ' + labelOf()(line.activityId)"
                    (click)="lineEdit.emit(line)"
                  >
                    <ui-icon name="edit" />
                  </button>
                }
              </li>
            }
          </ul>
        }
      </section>
    } @else if (pinDetail()) {
      <section class="detail pinned" aria-live="polite">
        <p class="none">Choisissez un jour pour voir ses activités.</p>
      </section>
    }
  `,
  styleUrl: './plan-calendar.component.scss',
})
export class PlanCalendar {
  readonly year = input.required<number>();
  readonly lines = input.required<readonly PlanLine[]>();
  /** Catégorie d'une activité (pour la couleur). */
  readonly categoryOf = input.required<(activityId: string) => ActivityCategory | undefined>();
  readonly labelOf = input.required<(activityId: string) => string>();
  /** Permet d'ajouter une activité sur un jour vide et de modifier les lignes. */
  readonly editable = input(false);
  /** Catégories de la légende ; toutes par défaut. */
  /** Garde le détail du jour visible en bas de la zone défilante. */
  readonly pinDetail = input(false);
  /** Une visite se décrit par sa plantation, les autres activités par leur lot et leurs heures. */
  protected isVisit(line: PlanLine): boolean {
    return this.categoryOf()(line.activityId) === 'VISITE';
  }

  /**
   * Rang de chaque séance de formation ou de rencontre parmi celles de la même activité, par
   * ordre de date : « Session n » pour une formation, « Animation n » pour une rencontre.
   */
  protected readonly rankOf = computed<ReadonlyMap<string, number>>(() => {
    const ranks = new Map<string, number>();
    const byActivity = new Map<string, PlanLine[]>();
    for (const line of this.lines()) {
      if (RANK_WORD[this.categoryOf()(line.activityId) ?? 'VISITE']) {
        byActivity.set(line.activityId, [...(byActivity.get(line.activityId) ?? []), line]);
      }
    }
    for (const group of byActivity.values()) {
      [...group]
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
        .forEach((line, index) => ranks.set(line.id, index + 1));
    }
    return ranks;
  });

  protected rankLabel(line: PlanLine): string {
    const word = RANK_WORD[this.categoryOf()(line.activityId) ?? 'VISITE'];
    const rank = this.rankOf().get(line.id);
    return word && rank ? `${word} ${rank}` : '';
  }

  readonly shownCategories = input<readonly ActivityCategory[] | null>(null);

  readonly lineEdit = output<PlanLine>();
  readonly dayAdd = output<string>();

  protected readonly legend = computed(() => {
    const shown = this.shownCategories();
    return shown ? ACTIVITY_CATEGORIES.filter((c) => shown.includes(c.code)) : ACTIVITY_CATEGORIES;
  });
  protected readonly weekdays = WEEKDAYS;
  protected readonly today = todayIso(new Date());
  protected readonly longDate = longDate;
  protected readonly formatHours = formatHours;
  protected readonly formatPeriod = formatPeriod;
  protected readonly selected = signal<string | null>(null);

  private readonly byDate = computed(() => linesByDate(this.lines()));

  protected readonly months = computed<readonly MonthView[]>(() => {
    const year = this.year();
    const byDate = this.byDate();
    return Array.from({ length: 12 }, (_, index) => {
      const cells = monthCells(year, index).map((day) => {
        const iso = day === null ? '' : isoOf(year, index, day);
        return { day, iso, lines: day === null ? [] : (byDate.get(iso) ?? []) };
      });
      return {
        index,
        name: monthName(year, index),
        count: cells.reduce((sum, c) => sum + c.lines.length, 0),
        cells,
      };
    });
  });

  protected readonly selectedLines = computed(() => {
    const iso = this.selected();
    return iso ? (this.byDate().get(iso) ?? []) : [];
  });

  protected color(category: ActivityCategory): string {
    return CATEGORY_COLOR[category];
  }

  protected lineColor(line: PlanLine): string {
    const category = this.categoryOf()(line.activityId);
    return category ? CATEGORY_COLOR[category] : 'var(--ink-300)';
  }

  /** Teinte de fond d'un jour : celle de sa première activité. */
  protected tint(lines: readonly PlanLine[]): string {
    return lines[0] ? this.lineColor(lines[0]) : 'transparent';
  }

  protected dayLabel(iso: string, lines: readonly PlanLine[]): string {
    const date = longDate(iso);
    return lines.length === 0
      ? date
      : `${date} : ${lines.map((l) => this.labelOf()(l.activityId)).join(', ')}`;
  }

  protected select(iso: string): void {
    this.selected.update((current) => (current === iso ? null : iso));
  }
}
