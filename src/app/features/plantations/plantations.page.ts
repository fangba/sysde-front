import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { ToastService } from '@core/notifications/toast.service';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PeriodSelectComponent } from '@shared/ui/period-select/period-select.component';
import { formatInteger, formatPercentRounded } from '@shared/util/format';

import { readPlanFile } from '../planning/data/planning.excel';
import { downloadAssignmentTemplate } from './data/plantations.excel';
import { AssignmentImportDialog, type AssignmentImportData } from './assignment-import.dialog';
import { STAGE_LABEL, type Plantation } from './data/plantations.models';
import {
  ALL,
  applyFilter,
  parseAssignmentRows,
  totalsOf,
  type AssignmentItem,
} from './data/plantations.rules';
import { PlantationDialog } from './plantation.dialog';
import { PlantationsStore } from './state/plantations.store';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const UNASSIGNED = 'Non affectée';

/** Plantations encadrées (lecture seule), dans le périmètre de l'utilisateur. */
@Component({
  selector: 'sysde-plantations-page',
  imports: [
    ButtonComponent,
    CardComponent,
    DataTableComponent,
    IconComponent,
    PageHeaderComponent,
    PeriodSelectComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plantations.page.html',
  styleUrl: './plantations.page.scss',
})
export class PlantationsPage {
  protected readonly store = inject(PlantationsStore);
  private readonly currentUser = inject(CurrentUser);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly toast = inject(ToastService);
  protected readonly downloading = signal(false);

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

  protected readonly columns = computed<readonly TableColumn<Plantation>[]>(() => [
    {
      id: 'code',
      header: 'Plantation',
      text: (p) => p.code,
      sub: (p) => p.village,
      filter: 'text',
    },
    {
      id: 'planter',
      header: 'Planteur',
      text: (p) => p.planter.name,
      sub: (p) => p.planter.phone,
      filter: 'text',
    },
    {
      id: 'zone',
      header: 'Secteur',
      text: (p) => `${p.operator} · ${p.sectorCode}`,
      filter: 'text',
    },
    {
      id: 'lot',
      header: 'Lot',
      text: (p) => `Lot ${p.lot}`,
      nowrap: true,
      filter: 'text',
    },
    {
      id: 'section',
      header: 'Section',
      text: (p) => p.sectionName ?? UNASSIGNED,
      pill: (p) => ({
        label: p.sectionName ?? UNASSIGNED,
        tone: p.sectionName ? 'green' : 'neutral',
      }),
      filter: [UNASSIGNED, ...this.sectionFilterNames()],
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
      filter: Object.values(STAGE_LABEL),
    },
  ]);

  /** Noms de section proposés au filtre : ceux affectés, plus ceux créés par le chef secteur. */
  private readonly sectionFilterNames = computed(() =>
    [
      ...new Set([
        ...this.store.sectionNames(),
        ...this.store.rows().flatMap((p) => (p.sectionName ? [p.sectionName] : [])),
      ]),
    ].sort((a, b) => a.localeCompare(b, 'fr')),
  );

  protected readonly rowLabel = (p: Plantation): string => p.code;

  constructor() {
    this.store.load();
    this.store.loadSections();
  }

  protected chooseOperator(value: string): void {
    this.operator.set(value);
    this.sector.set(ALL);
  }

  protected async downloadTemplate(): Promise<void> {
    this.downloading.set(true);
    try {
      await downloadAssignmentTemplate(this.rows(), this.store.sectionNames());
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
      const result = parseAssignmentRows(
        await readPlanFile(file),
        this.store.rows(),
        this.store.sections(),
        this.store.lots(),
        this.store.sectorRefs(),
      );
      const data: AssignmentImportData = { fileName: file.name, result };
      this.dialog
        .open<readonly AssignmentItem[]>(AssignmentImportDialog, {
          data,
          injector: this.injector,
          panelClass: 'ui-dialog-panel',
          width: 'min(640px, calc(100vw - 32px))',
          backdropClass: 'ui-dialog-backdrop',
        })
        .closed.subscribe((items) => {
          if (items && items.length > 0) {
            this.store.assignMany(
              items.map((i) => ({ plantationId: i.plantation.id, sectionId: i.section.id })),
              () => undefined,
            );
          }
        });
    } catch {
      this.toast.show(
        "Ce fichier n'a pas pu être lu. Utilisez le modèle Excel au format .xlsx.",
        'error',
      );
    }
  }

  protected open(plantation: Plantation): void {
    this.dialog.open(PlantationDialog, {
      data: plantation,
      injector: this.injector,
      panelClass: 'ui-drawer-panel',
      width: 'min(520px, 100vw)',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
    });
  }
}
