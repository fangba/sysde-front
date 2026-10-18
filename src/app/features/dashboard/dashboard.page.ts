import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CurrentUser } from '@core/auth/current-user';

import { AreaChartComponent } from '@shared/ui/area-chart/area-chart.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DeadlineItemComponent } from '@shared/ui/deadline-item/deadline-item.component';
import { DonutComponent } from '@shared/ui/donut/donut.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { KpiCardComponent } from '@shared/ui/kpi-card/kpi-card.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PeriodSelectComponent } from '@shared/ui/period-select/period-select.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { formatPercentRounded } from '@shared/util/format';

import { PERIOD_OPTIONS, type PeriodId } from './data/dashboard.models';
import { DashboardStore } from './state/dashboard.store';

@Component({
  selector: 'sysde-dashboard-page',
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
    PeriodSelectComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  protected readonly store = inject(DashboardStore);
  protected readonly currentUser = inject(CurrentUser);
  protected readonly periods = PERIOD_OPTIONS;
  protected readonly skeletons = [0, 1, 2, 3];
  protected readonly formatPercentRounded = formatPercentRounded;

  constructor() {
    this.store.load();
  }

  protected onPeriodChange(value: string): void {
    this.store.setPeriod(value as PeriodId);
  }
}
