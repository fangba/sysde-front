import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { toApiError } from '@core/http/api-error';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KpiCardComponent } from '@shared/ui/kpi-card/kpi-card.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatusPillComponent } from '@shared/ui/status-pill/status-pill.component';

import { PlanningApi } from '../../planning/data/planning.api';
import type { AnnualPlan } from '../../planning/data/planning.models';
import { planStatusView } from '../../planning/data/planning.rules';
import { POSTE_LABEL } from '../../settings/data/settings.constants';
import { SettingsStore } from '../../settings/state/settings.store';

/**
 * Dashboard de la secrétaire : personnel de son secteur et état des plannings de l'équipe,
 * en lecture seule.
 */
@Component({
  selector: 'sysde-staff-dashboard',
  imports: [
    ButtonComponent,
    CardComponent,
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
        currentUser.sectorLabel() || 'Personnel de votre secteur et plannings de l’équipe.'
      "
    />

    @if (status() === 'loading') {
      <div class="kpis" aria-busy="true" aria-label="Chargement des indicateurs">
        @for (i of skeletons; track i) {
          <ui-card><ui-skeleton height="112px" /></ui-card>
        }
      </div>
    } @else if (status() === 'error') {
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
    } @else {
      <section class="kpis" aria-label="Indicateurs clés">
        <ui-kpi-card
          label="Personnel du secteur"
          [value]="'' + staff().length"
          icon="users"
          [hint]="activeCount() + ' comptes actifs'"
        />
        <ui-kpi-card
          label="Collaborateurs planifiés"
          [value]="'' + rows().length"
          icon="calendar"
          hint="Postes CF, CO, FS, MO et ES"
        />
        <ui-kpi-card
          label="Plannings à valider"
          [value]="'' + pending()"
          icon="clock"
          tone="amber"
          hint="Soumis au chef secteur"
        />
        <ui-kpi-card
          label="Plannings validés"
          [value]="'' + validated()"
          icon="check"
          [hint]="'sur ' + rows().length + ' collaborateurs'"
        />
      </section>

      <div class="lower">
        <ui-card
          heading="Plannings de l'équipe"
          [subheading]="'Année ' + year + ' · lecture seule'"
        >
          @for (row of rows(); track row.id) {
            <div class="row">
              <div class="who">
                <p class="name">{{ row.name }}</p>
                <p class="meta">
                  {{ row.poste }} · {{ row.count }} activité{{ row.count > 1 ? 's' : '' }}
                </p>
              </div>
              <ui-status-pill [tone]="row.tone">{{ row.label }}</ui-status-pill>
            </div>
          } @empty {
            <ui-empty-state icon="calendar" title="Aucun collaborateur planifié" />
          }
        </ui-card>

        <ui-card heading="Personnel par poste" subheading="Comptes de votre secteur">
          @for (item of byPoste(); track item.poste) {
            <div class="row">
              <p class="name">{{ item.label }}</p>
              <ui-status-pill tone="neutral">{{ item.count }}</ui-status-pill>
            </div>
          } @empty {
            <ui-empty-state icon="users" title="Aucun compte dans votre secteur" />
          }
        </ui-card>
      </div>
    }
  `,
  styleUrl: '../dashboard.page.scss',
  styles: `
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 0;
      border-top: 1px solid var(--line);
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
  `,
})
export class StaffDashboardPage {
  protected readonly currentUser = inject(CurrentUser);
  private readonly settings = inject(SettingsStore);
  private readonly planning = inject(PlanningApi);

  protected readonly year = new Date().getFullYear();
  protected readonly skeletons = [0, 1, 2, 3];
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

  /** Comptes du secteur de la secrétaire (sinon, de son opérateur). */
  protected readonly staff = computed(() => {
    const me = this.currentUser.user();
    const operator = this.settings.operators.items().find((o) => o.acronym === me.operator.acronym);
    const sector = this.settings.sectors().find((s) => s.code === me.sector?.code);
    return this.settings.users
      .items()
      .filter((u) => u.operatorId === operator?.id && (sector ? u.sectorId === sector.id : true));
  });
  protected readonly activeCount = computed(() => this.staff().filter((u) => u.active).length);

  protected readonly byPoste = computed(() => {
    const counts = new Map<string, number>();
    for (const user of this.staff()) {
      counts.set(user.poste, (counts.get(user.poste) ?? 0) + 1);
    }
    return [...counts].map(([poste, count]) => ({
      poste,
      count,
      label: POSTE_LABEL[poste as keyof typeof POSTE_LABEL] ?? poste,
    }));
  });

  protected readonly rows = computed(() =>
    this.plans().map((plan) => {
      const user = this.settings.users.items().find((u) => u.id === plan.userId);
      const view = planStatusView(plan);
      return {
        id: plan.id,
        name: user ? `${user.firstName} ${user.lastName}` : 'Collaborateur',
        poste: user ? (POSTE_LABEL[user.poste as keyof typeof POSTE_LABEL] ?? user.poste) : '',
        count: plan.lines.length,
        status: plan.status,
        ...view,
      };
    }),
  );
  protected readonly pending = computed(
    () => this.rows().filter((r) => r.status === 'SOUMIS').length,
  );
  protected readonly validated = computed(
    () => this.rows().filter((r) => r.status === 'VALIDE').length,
  );

  constructor() {
    this.load();
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
