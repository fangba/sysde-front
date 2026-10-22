import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CurrentUser } from '@core/auth/current-user';
import { AreaChartComponent } from '@shared/ui/area-chart/area-chart.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DeadlineItemComponent } from '@shared/ui/deadline-item/deadline-item.component';
import { DonutComponent, type DonutSlice } from '@shared/ui/donut/donut.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KpiCardComponent } from '@shared/ui/kpi-card/kpi-card.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { todayIso } from '@shared/util/dates';
import { formatDate, formatPercentRounded } from '@shared/util/format';
import { SHORT_MONTHS } from '@shared/util/months';

import { ACTIVITY_CATEGORIES } from '../../settings/data/settings.constants';
import type { ActivityCategory } from '../../settings/data/settings.models';
import { SettingsStore } from '../../settings/state/settings.store';
import { planStatusView } from '../../planning/data/planning.rules';
import { PlanningStore } from '../../planning/state/planning.store';
import { PlanObjectives } from '../../planning/ui/plan-objectives.component';
import {
  FIELD_PROFILES,
  daysPerCategory,
  daysPerMonth,
  daysUntil,
  inMonth,
  isFieldPoste,
  objectiveRate,
  upcoming,
} from './field.data';

const CATEGORY_TONE = { FORMATION: 'green', VISITE: 'violet', RENCONTRE: 'mint' } as const;

/**
 * Dashboard d'un poste de terrain (MO, FS, CF, CO, ES) : état du planning annuel, activités du
 * mois, prochaines activités, objectifs annuels et règles d'encadrement du poste.
 */
@Component({
  selector: 'sysde-field-dashboard',
  imports: [
    RouterLink,
    AreaChartComponent,
    ButtonComponent,
    CardComponent,
    DeadlineItemComponent,
    DonutComponent,
    EmptyStateComponent,
    IconComponent,
    KpiCardComponent,
    PageHeaderComponent,
    PlanObjectives,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header [title]="profile().title" [subtitle]="profile().subtitle">
      <a ui-button variant="primary" routerLink="/planning">
        <ui-icon name="calendar" />
        Mon planning
      </a>
    </ui-page-header>

    @switch (store.status()) {
      @case ('loading') {
        <div class="kpis" aria-busy="true" aria-label="Chargement des indicateurs">
          @for (i of skeletons; track i) {
            <ui-card><ui-skeleton height="112px" /></ui-card>
          }
        </div>
        <div class="lower">
          <ui-card><ui-skeleton height="340px" /></ui-card>
          <ui-card><ui-skeleton height="340px" /></ui-card>
        </div>
      }
      @case ('error') {
        <ui-card>
          <ui-empty-state
            icon="alert"
            tone="red"
            title="Impossible de charger le tableau de bord"
            [description]="store.error()"
          >
            <button ui-button variant="primary" type="button" (click)="reload()">
              <ui-icon name="refresh" />
              Réessayer
            </button>
          </ui-empty-state>
        </ui-card>
      }
      @case ('ready') {
        <section class="kpis" aria-label="Indicateurs clés">
          <ui-kpi-card
            label="Statut du planning"
            [value]="status().label"
            icon="clipboard"
            [tone]="status().tone"
            [hint]="'Planning ' + store.year()"
          />
          <ui-kpi-card
            label="Activités ce mois-ci"
            [value]="'' + monthLines().length"
            icon="calendar"
            [hint]="monthHint()"
          />
          <ui-kpi-card
            label="Prochaine activité"
            [value]="nextValue()"
            icon="clock"
            [hint]="nextHint()"
          />
          <ui-kpi-card
            label="Objectifs annuels"
            [value]="rateValue()"
            icon="chart"
            [hint]="rateHint()"
          />
        </section>

        <div class="lower">
          <ui-card
            heading="Jours d'activité par mois"
            [subheading]="'Planning ' + store.year() + ' : jours où une activité est prévue'"
          >
            <ui-area-chart
              ariaLabel="Nombre de jours d'activité prévus chaque mois"
              unit="j"
              [minTop]="4"
              [labels]="monthLabels"
              [series]="chartSeries()"
            />
          </ui-card>

          <div class="side">
            <ui-card heading="Répartition par catégorie" subheading="Jours d'activité prévus">
              <ui-donut
                ariaLabel="Répartition des jours d'activité prévus par catégorie"
                caption="jours"
                [slices]="slices()"
              />
            </ui-card>
          </div>
        </div>

        <div class="lower">
          <ui-card heading="Prochaines activités" subheading="En cours ou à venir">
            @for (line of next(); track line.id) {
              <ui-deadline-item
                [title]="store.activityLabel(line.activityId)"
                [meta]="line.place"
                [date]="line.date"
                [daysLeft]="daysUntil(line)"
                icon="calendar"
              />
            } @empty {
              <ui-empty-state
                icon="calendar"
                title="Aucune activité à venir"
                description="Élaborez votre planning pour voir vos prochaines activités."
              />
            }
          </ui-card>

          <div class="side">
            @if (store.objectives().length > 0) {
              <sysde-plan-objectives [objectives]="store.objectives()" />
            }
            <ui-card heading="Règles d'encadrement" [subheading]="posteLabel()">
              <ul class="rules">
                @for (rule of profile().rules; track rule) {
                  <li>{{ rule }}</li>
                }
              </ul>
            </ui-card>
          </div>
        </div>
      }
    }
  `,
  styleUrl: '../dashboard.page.scss',
  styles: `
    .rules {
      display: grid;
      gap: 10px;
      margin: 0;
      padding-left: 18px;
      list-style: disc;
      font-size: 13.5px;
      line-height: 1.5;
    }
  `,
})
export class FieldDashboardPage {
  protected readonly store = inject(PlanningStore);
  private readonly settings = inject(SettingsStore);
  private readonly currentUser = inject(CurrentUser);

  protected readonly skeletons = [0, 1, 2, 3];
  protected readonly monthLabels = SHORT_MONTHS;
  protected readonly today = todayIso(new Date());
  protected readonly formatPercentRounded = formatPercentRounded;

  protected readonly profile = computed(() => {
    const poste = this.currentUser.user().poste;
    return FIELD_PROFILES[isFieldPoste(poste) ? poste : 'MO'];
  });
  protected readonly posteLabel = computed(() => this.currentUser.user().role);
  protected readonly status = computed(() => {
    const plan = this.store.plan();
    return planStatusView(plan ?? { status: 'BROUILLON' });
  });

  protected readonly monthLines = computed(() =>
    inMonth(this.store.draft(), this.store.year(), Number(this.today.slice(5, 7))),
  );
  protected readonly monthHint = computed(() => {
    const days = daysPerMonth(this.monthLines(), this.store.year())[
      Number(this.today.slice(5, 7)) - 1
    ];
    return `${days ?? 0} jour${(days ?? 0) > 1 ? 's' : ''} d'activité`;
  });
  protected readonly next = computed(() => upcoming(this.store.draft(), this.today, 5));
  protected readonly nextValue = computed(() => {
    const first = this.next()[0];
    return first ? formatDate(first.date) : '—';
  });
  protected readonly nextHint = computed(() => {
    const first = this.next()[0];
    return first ? this.store.activityLabel(first.activityId) : 'Rien de prévu';
  });
  protected readonly rate = computed(() => objectiveRate(this.store.objectives()));
  protected readonly rateValue = computed(() => {
    const rate = this.rate();
    return rate === null ? '—' : formatPercentRounded(rate);
  });
  protected readonly rateHint = computed(() => {
    const objectives = this.store.objectives();
    if (objectives.length === 0) {
      return 'Aucun objectif annuel défini pour votre poste';
    }
    const planned = objectives.reduce((sum, o) => sum + Math.min(o.planned, o.target), 0);
    const target = objectives.reduce((sum, o) => sum + o.target, 0);
    return `${planned} séances prévues sur ${target}`;
  });

  protected readonly chartSeries = computed(() => [
    {
      name: "Jours d'activité",
      tone: 'green' as const,
      values: daysPerMonth(this.store.draft(), this.store.year()),
    },
  ]);
  protected readonly slices = computed<readonly DonutSlice[]>(() => {
    const totals = daysPerCategory(this.store.draft(), (id) => this.store.categoryOf(id));
    return ACTIVITY_CATEGORIES.map((c: { code: ActivityCategory; label: string }) => ({
      name: c.label,
      value: totals[c.code],
      tone: CATEGORY_TONE[c.code],
    }));
  });

  constructor() {
    this.settings.load();
    this.store.load();
  }

  protected daysUntil(line: { date: string }): number {
    return daysUntil(line, this.today);
  }

  protected reload(): void {
    this.settings.load();
    this.store.load();
  }
}
