import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PeriodSelectComponent } from '@shared/ui/period-select/period-select.component';
import { formatInteger, formatPercentRounded } from '@shared/util/format';

import { STAGE_LABEL, type Plantation } from './data/plantations.models';
import { ALL, applyFilter, totalsOf } from './data/plantations.rules';
import { PlantationDialog } from './plantation.dialog';
import { PlantationsStore } from './state/plantations.store';

/** Plantations encadrées (lecture seule), dans le périmètre de l'utilisateur. */
@Component({
  selector: 'sysde-plantations-page',
  imports: [CardComponent, DataTableComponent, PageHeaderComponent, PeriodSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plantations.page.html',
  styleUrl: './plantations.page.scss',
})
export class PlantationsPage {
  protected readonly store = inject(PlantationsStore);
  private readonly currentUser = inject(CurrentUser);
  private readonly dialog = inject(Dialog);

  protected readonly operator = signal(ALL);
  protected readonly sector = signal(ALL);

  protected readonly operatorOptions = computed(() => [
    { value: ALL, label: 'Tous les opérateurs' },
    ...this.store.operators().map((o) => ({ value: o, label: o })),
  ]);

  /** Secteurs de l'opérateur choisi (tous, s'il n'y a pas de filtre d'opérateur). */
  protected readonly sectorOptions = computed(() => [
    { value: ALL, label: 'Tous les secteurs' },
    ...this.store
      .sectors()
      .filter((s) => this.operator() === ALL || s.operator === this.operator())
      .map((s) => ({
        value: s.key,
        label: this.operator() === ALL ? `${s.operator} · ${s.code}` : `${s.code} · ${s.name}`,
      })),
  ]);

  protected readonly rows = computed(() =>
    applyFilter(this.store.rows(), { operator: this.operator(), sector: this.sector() }),
  );
  private readonly totals = computed(() => totalsOf(this.rows()));

  protected readonly subtitle = computed(() => {
    const user = this.currentUser.user();
    return this.currentUser.hasGlobalView()
      ? 'Plantations encadrées par l’ensemble des opérateurs.'
      : this.currentUser.isDepartmentHead()
        ? `Plantations encadrées par ${user.operator.acronym}.`
        : `Plantations du secteur ${user.sector?.code ?? ''}.`.replace(' .', '.');
  });

  protected readonly count = computed(() => {
    const n = this.rows().length;
    return `${formatInteger(n)} plantation${n > 1 ? 's' : ''}`;
  });

  protected readonly stats = computed(() => {
    const t = this.totals();
    return [
      { label: 'Plantations', value: formatInteger(t.count) },
      { label: 'Planteurs', value: formatInteger(t.planters) },
      { label: 'Superficie', value: `${formatInteger(t.hectares)} ha` },
      { label: 'Géolocalisées', value: formatPercentRounded(t.geolocatedRate) },
    ];
  });

  protected readonly columns: readonly TableColumn<Plantation>[] = [
    { id: 'code', header: 'Plantation', text: (p) => p.code, sub: (p) => p.village },
    { id: 'planter', header: 'Planteur', text: (p) => p.planter.name, sub: (p) => p.planter.phone },
    {
      id: 'zone',
      header: 'Secteur',
      text: (p) => `${p.operator} · ${p.sectorCode}`,
      sub: (p) => `Lot ${p.lot} · Section ${p.section}`,
    },
    { id: 'area', header: 'Superficie', text: (p) => `${formatInteger(p.hectares)} ha` },
    {
      id: 'stage',
      header: 'État',
      text: (p) => STAGE_LABEL[p.stage],
      pill: (p) => ({
        label: STAGE_LABEL[p.stage],
        tone: p.stage === 'SAIGNEE' ? 'green' : 'amber',
      }),
    },
  ];

  protected readonly rowLabel = (p: Plantation): string => p.code;

  constructor() {
    this.store.load();
  }

  protected chooseOperator(value: string): void {
    this.operator.set(value);
    this.sector.set(ALL);
  }

  protected open(plantation: Plantation): void {
    this.dialog.open(PlantationDialog, {
      data: plantation,
      panelClass: 'ui-drawer-panel',
      width: 'min(520px, 100vw)',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
    });
  }
}
