import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { DonutComponent, type DonutSlice } from '@shared/ui/donut/donut.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PeriodSelectComponent } from '@shared/ui/period-select/period-select.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { formatInteger, formatPercentRounded } from '@shared/util/format';

import { toCsv, totalsOf } from './data/reporting.calculations';
import {
  DEMO_REPORT_OPERATORS,
  REPORT_PERIOD,
  buildReport,
  demoSectorsOfOperator,
} from './data/reporting.demo';
import {
  REPORT_STATUS_LABEL,
  REPORT_STATUS_TONE,
  type ReportLevel,
  type ReportRow,
  type ReportScope,
} from './data/reporting.models';

interface LevelText {
  readonly title: string;
  readonly subtitle: string;
  readonly heading: string;
  readonly nameHeader: string;
  readonly unit: string;
  readonly planters: string;
}

const ALL_SECTORS = 'ALL';
const ALL_OPERATORS = 'ALL';

const TEXT: Readonly<Record<ReportLevel, LevelText>> = {
  organisme: {
    title: 'Reporting national',
    subtitle: 'Rapports mensuels transmis par chaque opérateur technique.',
    heading: 'Rapports par opérateur',
    nameHeader: 'Opérateur',
    unit: 'opérateurs',
    planters: 'Planteurs encadrés',
  },
  operateur: {
    title: 'Reporting du département',
    subtitle: 'Rapports mensuels de chacun de vos secteurs.',
    heading: 'Rapports par secteur',
    nameHeader: 'Secteur',
    unit: 'secteurs',
    planters: 'Planteurs du département',
  },
  secteur: {
    title: 'Reporting du secteur',
    subtitle: 'Rapports mensuels de chacun de vos collaborateurs.',
    heading: 'Rapports par collaborateur',
    nameHeader: 'Collaborateur',
    unit: 'collaborateurs',
    planters: 'Planteurs du secteur',
  },
};

@Component({
  selector: 'sysde-reporting-page',
  imports: [
    ButtonComponent,
    CardComponent,
    DataTableComponent,
    DonutComponent,
    IconComponent,
    PageHeaderComponent,
    PeriodSelectComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reporting.page.html',
  styleUrl: './reporting.page.scss',
})
export class ReportingPage {
  private readonly currentUser = inject(CurrentUser);

  private readonly level = computed<ReportLevel>(() =>
    this.currentUser.isAdministrator()
      ? 'organisme'
      : this.currentUser.isDepartmentHead()
        ? 'operateur'
        : 'secteur',
  );

  /** Titre de la page : dépend du rôle ; le tableau, lui, suit le niveau affiché. */
  protected readonly pageText = computed(() => TEXT[this.level()]);
  protected readonly text = computed(() => TEXT[this.report().level]);

  /** Administrateur : filtre par opérateur technique. */
  protected readonly filtersByOperator = computed(() => this.level() === 'organisme');
  protected readonly operator = signal(ALL_OPERATORS);
  protected readonly operatorOptions = [
    { value: ALL_OPERATORS, label: 'Tous les opérateurs' },
    ...DEMO_REPORT_OPERATORS.map((o) => ({ value: o, label: o })),
  ];

  /** Chef de département : filtre par secteur de son opérateur. */
  protected readonly filtersBySector = computed(() => this.level() === 'operateur');
  protected readonly sector = signal(ALL_SECTORS);
  protected readonly sectorOptions = computed(() => [
    { value: ALL_SECTORS, label: 'Tous les secteurs' },
    ...demoSectorsOfOperator(this.currentUser.user().operator.acronym).map((s) => ({
      value: s.code,
      label: `${s.code} · ${s.name}`,
    })),
  ]);
  protected readonly period = REPORT_PERIOD;

  private readonly report = computed(() => {
    const user = this.currentUser.user();
    const scope: ReportScope = {
      level: this.level(),
      operator: user.operator.acronym,
      ...(this.filtersByOperator() && this.operator() !== ALL_OPERATORS
        ? { filterOperator: this.operator() }
        : {}),
      ...(this.filtersBySector() && this.sector() !== ALL_SECTORS
        ? { filterSector: this.sector() }
        : {}),
      ...(user.sector ? { sector: user.sector.code } : {}),
    };
    return buildReport(scope);
  });

  protected readonly rows = computed(() => this.report().rows);
  protected readonly totals = computed(() => totalsOf(this.rows()));

  protected readonly stats = computed(() => {
    const t = this.totals();
    const text = this.text();
    return [
      { label: text.planters, value: formatInteger(t.planters) },
      { label: 'Superficie encadrée', value: `${formatInteger(t.hectares)} ha` },
      { label: 'Production du mois', value: `${formatInteger(t.production)} t` },
      { label: 'Taux de visites', value: formatPercentRounded(t.visitRate) },
    ];
  });

  protected readonly slices = computed<readonly DonutSlice[]>(() => {
    const by = this.totals().byStatus;
    return [
      { name: REPORT_STATUS_LABEL.transmis, value: by.transmis, tone: 'green' },
      { name: REPORT_STATUS_LABEL['en-cours'], value: by['en-cours'], tone: 'mint' },
      { name: REPORT_STATUS_LABEL['en-retard'], value: by['en-retard'], tone: 'violet' },
    ];
  });

  protected readonly submitted = computed(() => {
    const t = this.totals();
    return `${t.byStatus.transmis} sur ${this.rows().length} ${this.text().unit} ont transmis leur rapport`;
  });

  protected readonly columns = computed<readonly TableColumn<ReportRow>[]>(() => [
    { id: 'name', header: this.text().nameHeader, text: (r) => r.name, sub: (r) => r.detail },
    { id: 'planters', header: 'Planteurs', text: (r) => formatInteger(r.planters) },
    { id: 'hectares', header: 'Superficie', text: (r) => `${formatInteger(r.hectares)} ha` },
    { id: 'production', header: 'Production', text: (r) => `${formatInteger(r.production)} t` },
    { id: 'visits', header: 'Visites', text: (r) => formatPercentRounded(r.visitRate) },
    {
      id: 'status',
      header: 'Rapport',
      text: (r) => REPORT_STATUS_LABEL[r.status],
      pill: (r) => ({ label: REPORT_STATUS_LABEL[r.status], tone: REPORT_STATUS_TONE[r.status] }),
    },
  ]);

  protected readonly rowLabel = (row: ReportRow): string => row.name;

  protected exportCsv(): void {
    const csv = toCsv(
      [
        this.text().nameHeader,
        'Détail',
        'Planteurs',
        'Superficie (ha)',
        'Production (t)',
        'Visites',
        'Rapport',
      ],
      this.rows().map((r) => [
        r.name,
        r.detail,
        String(r.planters),
        String(r.hectares),
        String(r.production),
        formatPercentRounded(r.visitRate),
        REPORT_STATUS_LABEL[r.status],
      ]),
    );
    const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporting-${this.level()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
