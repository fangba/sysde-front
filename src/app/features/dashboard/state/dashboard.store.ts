import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Clock } from '@core/time/clock';
import { toApiError } from '@core/http/api-error';
import type { Tone } from '@shared/models/tone';
import type { AreaSeries } from '@shared/ui/area-chart/area-chart.component';
import type { DonutSlice } from '@shared/ui/donut/donut.component';
import type { IconName } from '@shared/ui/icon/icon.registry';
import { formatInteger, formatPercentRounded } from '@shared/util/format';
import { monthShortLabel } from '@shared/util/months';

import { DashboardApi } from '../data/dashboard.api';
import { daysUntil, lastMonths, latest, share, variation } from '../data/dashboard.calculations';
import {
  DEFAULT_PERIOD,
  PERIOD_OPTIONS,
  type DashboardData,
  type DeadlineKind,
  type PeriodId,
} from '../data/dashboard.models';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface KpiView {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly delta: number;
  readonly icon: IconName;
  readonly tone: Tone;
  readonly trend: readonly number[];
  readonly hint: string;
}

export interface DeadlineView {
  readonly id: string;
  readonly title: string;
  readonly meta: string;
  readonly date: string;
  readonly daysLeft: number;
  readonly icon: IconName;
}

const DEADLINE_ICON: Readonly<Record<DeadlineKind, IconName>> = {
  contrat: 'contract',
  rapport: 'chart',
  visite: 'pin',
};

/** État et vues dérivées du tableau de bord ; fourni au niveau de la route. */
@Injectable()
export class DashboardStore {
  private readonly api = inject(DashboardApi);
  private readonly clock = inject(Clock);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _status = signal<LoadStatus>('loading');
  private readonly _data = signal<DashboardData | null>(null);
  private readonly _error = signal('');
  private readonly _period = signal<PeriodId>(DEFAULT_PERIOD);

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly period = this._period.asReadonly();

  readonly kpis = computed<readonly KpiView[]>(() => {
    const data = this._data();
    if (!data) {
      return [];
    }
    const produced = data.monthly.map((m) => m.produced);
    const lastTarget = data.monthly[data.monthly.length - 1]?.target ?? 0;
    return [
      {
        id: 'production',
        label: 'Production du mois',
        value: `${formatInteger(latest(produced))} t`,
        delta: variation(produced),
        icon: 'leaf',
        tone: 'green',
        trend: produced,
        hint: `Objectif : ${formatInteger(lastTarget)} t`,
      },
      {
        id: 'planters',
        label: 'Planteurs encadrés',
        value: formatInteger(latest(data.planters)),
        delta: variation(data.planters),
        icon: 'users',
        tone: 'green',
        trend: data.planters,
        hint: 'Planteurs actifs en fin de mois',
      },
      {
        id: 'hectares',
        label: 'Superficie encadrée',
        value: `${formatInteger(latest(data.hectares))} ha`,
        delta: variation(data.hectares),
        icon: 'map',
        tone: 'violet',
        trend: data.hectares,
        hint: 'Plantations sous contrat',
      },
      {
        id: 'visits',
        label: 'Visites réalisées',
        value: formatPercentRounded(latest(data.visitRate)),
        delta: variation(data.visitRate),
        icon: 'clipboard',
        tone: 'green',
        trend: data.visitRate,
        hint: 'Part du programme du mois',
      },
    ];
  });

  readonly chartLabels = computed(() => this.window().map((m) => monthShortLabel(m.month)));

  readonly chartSeries = computed<readonly AreaSeries[]>(() => {
    const months = this.window();
    return [
      { name: 'Production', tone: 'green', values: months.map((m) => m.produced) },
      { name: 'Objectif', tone: 'violet', values: months.map((m) => m.target) },
    ];
  });

  readonly visitSlices = computed<readonly DonutSlice[]>(() => {
    const visits = this._data()?.visits;
    return visits
      ? [
          { name: 'Réalisées', value: visits.done, tone: 'green' },
          { name: 'Planifiées', value: visits.planned, tone: 'mint' },
          { name: 'Reportées', value: visits.postponed, tone: 'violet' },
        ]
      : [];
  });

  readonly visitCompletion = computed(() => {
    const visits = this._data()?.visits;
    return visits ? share(visits.done, visits.done + visits.planned + visits.postponed) : 0;
  });

  readonly deadlines = computed<readonly DeadlineView[]>(() => {
    const now = this.clock.now();
    return (this._data()?.deadlines ?? [])
      .map((d) => ({
        id: d.id,
        title: d.title,
        meta: d.operator,
        date: d.date,
        daysLeft: daysUntil(d.date, now),
        icon: DEADLINE_ICON[d.kind],
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  });

  load(): void {
    this._status.set('loading');
    this.api
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this._data.set(data);
          this._status.set('ready');
        },
        error: (error: unknown) => {
          this._error.set(toApiError(error).message);
          this._status.set('error');
        },
      });
  }

  setPeriod(period: PeriodId): void {
    this._period.set(period);
  }

  private readonly window = computed(() => {
    const months = PERIOD_OPTIONS.find((o) => o.value === this._period())?.months ?? 12;
    return lastMonths(this._data()?.monthly ?? [], months);
  });
}
