import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

import { formatDate } from '@shared/util/format';

import type { Attribution } from '../data/settings.models';
import { lotsLabel } from '../data/settings.rules';
import { SettingsStore } from '../state/settings.store';
import { AttributionDialog } from './attributions.dialog';

@Component({
  selector: 'sysde-attributions-tab',
  imports: [ButtonComponent, CardComponent, DataTableComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card
      heading="Attributions"
      subheading="Lots de chaque secteur confiés aux opérateurs, pour la période de leur contrat."
    >
      <ui-data-table
        [columns]="columns"
        [rows]="store.attributions.items()"
        [loading]="store.status() === 'loading'"
        caption="Liste des attributions"
        [rowLabel]="rowLabel"
        searchPlaceholder="Rechercher une attribution…"
        emptyTitle="Aucune attribution"
        emptyDescription="Attribuez les premiers lots d’un secteur à un opérateur."
        (rowEdit)="open($event)"
      >
        <button tableActions ui-button variant="primary" type="button" (click)="open(null)">
          <ui-icon name="plus" /> Nouvelle attribution
        </button>
      </ui-data-table>
    </ui-card>
  `,
})
export class AttributionsTab {
  protected readonly store = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  protected readonly rowLabel = (a: Attribution) =>
    `${this.store.sectorLabel(a.sectorId)} ${lotsLabel(a.lots)}`;
  protected readonly columns: readonly TableColumn<Attribution>[] = [
    { id: 'sector', header: 'Secteur', text: (a) => this.store.sectorLabel(a.sectorId) },
    { id: 'lots', header: 'Lots', text: (a) => lotsLabel(a.lots) },
    {
      id: 'operator',
      header: 'Opérateur',
      text: (a) => this.store.operatorLabel(this.store.contractOf(a.contractId)?.operatorId ?? ''),
    },
    {
      id: 'contract',
      header: 'Contrat',
      text: (a) => this.store.contractOf(a.contractId)?.reference ?? '—',
    },
    {
      id: 'period',
      header: 'Période',
      text: (a) => {
        const c = this.store.contractOf(a.contractId);
        return c ? `${formatDate(c.startDate)} → ${formatDate(c.endDate)}` : '—';
      },
    },
  ];

  protected open(item: Attribution | null): void {
    this.dialog.open(AttributionDialog, {
      data: { item },
      // Le store est fourni par la route : la fenêtre doit hériter de cet injecteur.
      injector: this.injector,
      // Panneau latéral qui s'encastre à droite de l'écran.
      panelClass: 'ui-drawer-panel',
      width: 'min(520px, 100vw)',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
    });
  }
}
