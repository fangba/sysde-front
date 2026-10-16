import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';

import { Clock } from '@core/time/clock';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { todayIso } from '@shared/util/dates';
import { formatDate } from '@shared/util/format';
import type { Tone } from '@shared/models/tone';

import type { Contract } from '../data/settings.models';
import { contractStatus, type ContractStatus } from '../data/settings.rules';
import { SettingsStore } from '../state/settings.store';
import { ContractDialog } from './contracts.dialog';

const STATUS: Readonly<Record<ContractStatus, { label: string; tone: Tone }>> = {
  upcoming: { label: 'À venir', tone: 'amber' },
  active: { label: 'En cours', tone: 'green' },
  ended: { label: 'Terminé', tone: 'neutral' },
};

@Component({
  selector: 'sysde-contracts-tab',
  imports: [ButtonComponent, CardComponent, DataTableComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card heading="Contrats" subheading="Un contrat triennal par opérateur technique.">
      <ui-data-table
        [columns]="columns"
        [rows]="store.contracts.items()"
        [loading]="store.status() === 'loading'"
        caption="Liste des contrats"
        [rowLabel]="rowLabel"
        searchPlaceholder="Rechercher un contrat…"
        emptyTitle="Aucun contrat"
        emptyDescription="Créez le premier contrat d’un opérateur."
        (rowEdit)="open($event)"
      >
        <button tableActions ui-button variant="primary" type="button" (click)="open(null)">
          <ui-icon name="plus" /> Nouveau contrat
        </button>
      </ui-data-table>
    </ui-card>
  `,
})
export class ContractsTab {
  protected readonly store = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly clock = inject(Clock);

  protected readonly rowLabel = (c: Contract) => c.reference;
  protected readonly columns: readonly TableColumn<Contract>[] = [
    { id: 'reference', header: 'Référence', text: (c) => c.reference },
    { id: 'operator', header: 'Opérateur', text: (c) => this.store.operatorLabel(c.operatorId) },
    {
      id: 'period',
      header: 'Période',
      text: (c) => `${formatDate(c.startDate)} → ${formatDate(c.endDate)}`,
    },
    {
      id: 'status',
      header: 'Statut',
      text: (c) => STATUS[this.statusOf(c)].label,
      pill: (c) => STATUS[this.statusOf(c)],
    },
  ];

  private statusOf(contract: Contract): ContractStatus {
    return contractStatus(contract, todayIso(this.clock.now()));
  }

  protected open(item: Contract | null): void {
    this.dialog.open(ContractDialog, {
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
