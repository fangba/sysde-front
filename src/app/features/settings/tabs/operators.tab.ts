import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

import { ACTIVE_TONE, OPERATOR_TYPE_LABEL } from '../data/settings.constants';
import type { Operator } from '../data/settings.models';
import { SettingsStore } from '../state/settings.store';
import { OperatorDialog } from './operators.dialog';

@Component({
  selector: 'sysde-operators-tab',
  imports: [ButtonComponent, CardComponent, DataTableComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card heading="Opérateurs" subheading="Organismes et opérateurs d’encadrement technique.">
      <ui-data-table
        [columns]="columns"
        [rows]="store.operators.items()"
        [loading]="store.status() === 'loading'"
        caption="Liste des opérateurs"
        [rowLabel]="rowLabel"
        searchPlaceholder="Rechercher un opérateur…"
        emptyTitle="Aucun opérateur"
        emptyDescription="Créez le premier opérateur pour commencer."
        (rowEdit)="open($event)"
      >
        <button tableActions ui-button variant="primary" type="button" (click)="open(null)">
          <ui-icon name="plus" /> Nouvel opérateur
        </button>
      </ui-data-table>
    </ui-card>
  `,
})
export class OperatorsTab {
  protected readonly store = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  protected readonly rowLabel = (o: Operator) => o.acronym;
  protected readonly columns: readonly TableColumn<Operator>[] = [
    { id: 'acronym', header: 'Acronyme', text: (o) => o.acronym },
    { id: 'name', header: 'Dénomination', text: (o) => o.name },
    { id: 'type', header: 'Type', text: (o) => OPERATOR_TYPE_LABEL[o.type] },
    { id: 'email', header: 'Contact', text: (o) => o.email || '—', sub: (o) => o.phone },
    {
      id: 'active',
      header: 'Statut',
      text: (o) => (o.active ? 'Actif' : 'Inactif'),
      pill: (o) => ({ label: o.active ? 'Actif' : 'Inactif', tone: ACTIVE_TONE[`${o.active}`] }),
    },
  ];

  protected open(item: Operator | null): void {
    this.dialog.open(OperatorDialog, {
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
