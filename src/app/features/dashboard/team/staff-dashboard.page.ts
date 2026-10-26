import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CurrentUser } from '@core/auth/current-user';
import { toApiError } from '@core/http/api-error';
import { AreaChartComponent } from '@shared/ui/area-chart/area-chart.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DeadlineItemComponent } from '@shared/ui/deadline-item/deadline-item.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KpiCardComponent } from '@shared/ui/kpi-card/kpi-card.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';
import { todayIso } from '@shared/util/dates';
import { formatPercentRounded } from '@shared/util/format';
import { SHORT_MONTHS } from '@shared/util/months';

import { PlanningApi } from '../../planning/data/planning.api';
import type { AnnualPlan } from '../../planning/data/planning.models';
import { rosterStatusOf } from '../../planning/data/planning.rules';
import { ROSTER_STATUS } from '../../planning/data/roster';
import { POSTE_LABEL } from '../../settings/data/settings.constants';
import { SettingsStore } from '../../settings/state/settings.store';
import { daysPerMonth, daysUntil } from './field.data';
import {
  coverageByPoste,
  countByStatus,
  toHandle,
  upcomingTeam,
  type StaffEntry,
} from './staff.data';

const POSTE_ORDER = ['MO', 'CO', 'CF', 'FS', 'ES', 'CS'] as const;
const RULES: readonly string[] = [
  'Vous saisissez et importez les plannings des MO, FS, CO, CF, ES et du chef secteur.',
  'Un planning saisi reste en brouillon : soumettez-le au chef secteur quand il est complet.',
  'Le planning du chef secteur est validé d’office dès que vous le soumettez.',
  'Un planning soumis ou validé est verrouillé ; un rejet le rend de nouveau modifiable.',
];

/**
 * Dashboard de la secrétaire : ce qu'il lui reste à saisir, à corriger ou à soumettre pour son
 * secteur, l'avancement par poste et la charge de l'équipe sur l'année.
 */
@Component({
  selector: 'sysde-staff-dashboard',
  imports: [
    RouterLink,
    AreaChartComponent,
    ButtonComponent,
    CardComponent,
    DeadlineItemComponent,
    EmptyStateComponent,
    IconComponent,
    KpiCardComponent,
    PageHeaderComponent,
    SkeletonComponent,
    StatusPillComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header
      title="Dashboard de la secrétaire"
      [subtitle]="
        currentUser.sectorLabel() ||
        'Plannings annuels de l’équipe de votre secteur : à saisir, à corriger, à soumettre.'
      "
    >
      <a ui-button variant="primary" routerLink="/planning/equipe">
        <ui-icon name="calendar" />
        Plannings de l'équipe
      </a>
    </ui-page-header>

    @switch (status()) {
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
            [description]="error()"
          >
            <button ui-button variant="primary" type="button" (click)="load()">
              <ui-icon name="refresh" />
              Réessayer
            </button>
          </ui-empty-state>
        </ui-card>
      }
      @default {
        <section class="kpis" aria-label="Indicateurs clés">
          <ui-kpi-card
            label="À saisir ou compléter"
            [value]="'' + toFill()"
            icon="clipboard"
            [tone]="toFill() > 0 ? 'amber' : 'green'"
            [hint]="counts().NONE + ' sans activité · ' + counts().DRAFT + ' en brouillon'"
          />
          <ui-kpi-card
            label="À corriger"
            [value]="'' + counts().REJECTED"
            icon="alert"
            [tone]="counts().REJECTED > 0 ? 'red' : 'green'"
            hint="Rejetés par le chef secteur"
          />
          <ui-kpi-card
            label="En attente du chef secteur"
            [value]="'' + counts().SENT"
            icon="clock"
            hint="Soumis, à valider"
          />
          <ui-kpi-card
            label="Plannings validés"
            [value]="validatedValue()"
            icon="check"
            [hint]="counts().OK + ' sur ' + entries().length + ' collaborateurs'"
          />
        </section>

        <div class="lower">
          <ui-card
            heading="Charge de l'équipe par mois"
            [subheading]="'Planning ' + year + ' : jours d’activité cumulés de l’équipe'"
          >
            <ui-area-chart
              ariaLabel="Nombre de jours d'activité prévus chaque mois pour l'ensemble de l'équipe"
              unit="j"
              [minTop]="4"
              [labels]="monthLabels"
              [series]="chartSeries()"
            />
          </ui-card>

          <div class="side">
            <ui-card heading="Remise par poste" subheading="Plannings soumis ou validés">
              <ul class="coverage">
                @for (item of coverage(); track item.poste) {
                  <li>
                    <span class="name">{{ posteLabel(item.poste) }}</span>
                    <span class="meter" aria-hidden="true">
                      <i [style.width.%]="(item.sent / item.total) * 100"></i>
                    </span>
                    <ui-status-pill [tone]="item.sent >= item.total ? 'green' : 'amber'">
                      {{ item.sent }} / {{ item.total }}
                    </ui-status-pill>
                  </li>
                } @empty {
                  <li class="none">Aucun collaborateur dans votre secteur.</li>
                }
              </ul>
            </ui-card>
          </div>
        </div>

        <div class="lower">
          <ui-card heading="Plannings à traiter" subheading="Rejetés d'abord, puis à saisir">
            @for (row of handle(); track row.userId) {
              <div class="row">
                <span class="avatar" aria-hidden="true">{{ row.initials }}</span>
                <div class="who">
                  <p class="name">{{ row.name }}</p>
                  <p class="meta">
                    {{ posteLabel(row.poste) }} · {{ row.lines.length }} activité{{
                      row.lines.length > 1 ? 's' : ''
                    }}
                  </p>
                </div>
                <ui-status-pill [tone]="statuses[row.status].tone">{{
                  statuses[row.status].label
                }}</ui-status-pill>
                <a
                  ui-button
                  variant="secondary"
                  [routerLink]="['/planning/equipe', row.userId]"
                  [attr.aria-label]="statuses[row.status].action + ' le planning de ' + row.name"
                >
                  {{ statuses[row.status].action }}
                </a>
              </div>
            } @empty {
              <ui-empty-state
                icon="check"
                title="Rien à traiter"
                description="Tous les plannings de l'équipe sont soumis ou validés."
              />
            }
            @if (handleMore() > 0) {
              <p class="more">
                {{ handleMore() }} autre{{ handleMore() > 1 ? 's' : '' }} planning{{
                  handleMore() > 1 ? 's' : ''
                }}
                à traiter —
                <a routerLink="/planning/equipe">voir toute l'équipe</a>
              </p>
            }
          </ui-card>

          <div class="side">
            <ui-card heading="Prochaines activités" subheading="De toute l'équipe">
              @for (item of next(); track item.line.id + item.who) {
                <ui-deadline-item
                  [title]="activityLabel(item.line.activityId)"
                  [meta]="item.who + ' · ' + item.line.place"
                  [date]="item.line.date"
                  [daysLeft]="daysUntil(item.line)"
                  icon="calendar"
                />
              } @empty {
                <ui-empty-state
                  icon="calendar"
                  title="Aucune activité à venir"
                  description="Saisissez les plannings pour voir les prochaines activités."
                />
              }
            </ui-card>
            <ui-card heading="Votre rôle" subheading="Saisie et import des plannings">
              <ul class="rules">
                @for (rule of rules; track rule) {
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
      margin: 14px 0 0;
      padding-left: 18px;
      list-style: disc;
      font-size: 13.5px;
      line-height: 1.5;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-top: 1px solid var(--line);
    }
    .avatar {
      display: grid;
      flex: none;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--green-100);
      color: var(--green-ink);
      font-size: 12px;
      font-weight: 700;
    }
    .who {
      flex: 1;
      min-width: 0;
    }
    .name {
      font-size: 14px;
      font-weight: 600;
    }
    .meta {
      margin-top: 2px;
      font-size: 12.5px;
      color: var(--ink-500);
    }
    .more {
      margin: 0;
      padding: 12px 0 0;
      border-top: 1px solid var(--line);
      color: var(--ink-500);
      font-size: 13px;

      a {
        color: var(--green-ink);
        font-weight: 600;
      }
    }
    .coverage {
      display: grid;
      gap: 12px;
      margin: 14px 0 0;
      padding: 0;
      list-style: none;

      li {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(50px, 90px) auto;
        align-items: center;
        gap: 12px;
        font-size: 13.5px;
      }
      .none {
        display: block;
        color: var(--ink-500);
      }
    }
    .meter {
      height: 6px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--neutral-100);

      i {
        display: block;
        height: 100%;
        background: var(--green-600);
      }
    }
  `,
})
export class StaffDashboardPage {
  protected readonly currentUser = inject(CurrentUser);
  private readonly settings = inject(SettingsStore);
  private readonly planning = inject(PlanningApi);

  protected readonly year = new Date().getFullYear();
  protected readonly today = todayIso(new Date());
  protected readonly skeletons = [0, 1, 2, 3];
  protected readonly monthLabels = SHORT_MONTHS;
  protected readonly statuses = ROSTER_STATUS;
  protected readonly rules = RULES;

  private readonly plans = signal<readonly AnnualPlan[]>([]);
  private readonly planStatus = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal('');

  protected readonly status = computed(() => {
    if (this.planStatus() === 'error' || this.settings.status() === 'error') {
      return 'error';
    }
    return this.planStatus() === 'ready' && this.settings.status() === 'ready'
      ? 'ready'
      : 'loading';
  });

  protected readonly entries = computed<readonly StaffEntry[]>(() =>
    this.plans().flatMap((plan) => {
      const user = this.settings.users.items().find((u) => u.id === plan.userId);
      if (!user) {
        return [];
      }
      return [
        {
          userId: user.id,
          name: `${user.lastName} ${user.firstName}`,
          initials: `${user.lastName.charAt(0)}${user.firstName.charAt(0)}`.toUpperCase(),
          poste: user.poste,
          status: rosterStatusOf(plan),
          lines: plan.lines,
        },
      ];
    }),
  );
  protected readonly counts = computed(() => countByStatus(this.entries()));
  protected readonly toFill = computed(() => this.counts().NONE + this.counts().DRAFT);
  protected readonly validatedValue = computed(() => {
    const total = this.entries().length;
    return total === 0 ? '—' : formatPercentRounded(this.counts().OK / total);
  });

  private readonly allToHandle = computed(() => toHandle(this.entries()));
  protected readonly handle = computed(() => this.allToHandle().slice(0, 6));
  protected readonly handleMore = computed(() => Math.max(0, this.allToHandle().length - 6));
  protected readonly coverage = computed(() => coverageByPoste(this.entries(), POSTE_ORDER));
  protected readonly next = computed(() => upcomingTeam(this.entries(), this.today, 4));
  protected readonly chartSeries = computed(() => [
    {
      name: "Jours d'activité",
      tone: 'green' as const,
      values: daysPerMonth(
        this.entries().flatMap((e) => e.lines),
        this.year,
      ),
    },
  ]);

  constructor() {
    this.load();
  }

  protected posteLabel(poste: string): string {
    return POSTE_LABEL[poste as keyof typeof POSTE_LABEL] ?? poste;
  }

  protected activityLabel(id: string): string {
    return this.settings.activities.items().find((a) => a.id === id)?.label ?? 'Activité';
  }

  protected daysUntil(line: { date: string }): number {
    return daysUntil(line, this.today);
  }

  protected load(): void {
    this.settings.load();
    this.planStatus.set('loading');
    this.planning.team(this.year).subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.planStatus.set('ready');
      },
      error: (error: unknown) => {
        this.error.set(toApiError(error).message);
        this.planStatus.set('error');
      },
    });
  }
}
