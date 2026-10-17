import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

import type { Sector } from '../data/settings.models';
import { SettingsStore } from '../state/settings.store';
import { SectorDialog } from './sectors.dialog';

@Component({
  selector: 'sysde-sectors-section',
  imports: [ButtonComponent, CardComponent, DataTableComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card heading="Secteurs" subheading="Zones d’encadrement du programme.">
      <ui-data-table
        [columns]="columns"
        [rows]="store.sectors()"
        [loading]="store.status() === 'loading'"
        caption="Liste des secteurs"
        [rowLabel]="rowLabel"
        searchPlaceholder="Rechercher un secteur…"
        emptyTitle="Aucun secteur"
        emptyDescription="Créez le premier secteur."
        (rowEdit)="open($event)"
      >
        <button tableActions ui-button variant="primary" type="button" (click)="open(null)">
          <ui-icon name="plus" /> Nouveau secteur
        </button>
      </ui-data-table>
    </ui-card>
  `,
})
export class SectorsSection {
  protected readonly store = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  protected readonly rowLabel = (s: Sector) => `${s.code} ${s.name}`;
  protected readonly columns: readonly TableColumn<Sector>[] = [
    { id: 'code', header: 'Code', text: (s) => s.code },
    { id: 'name', header: 'Nom', text: (s) => s.name },
    {
      id: 'lots',
      header: 'Lots',
      text: (s) => String(this.store.lotNumbersOf(s.id).length),
    },
  ];

  protected open(item: Sector | null): void {
    this.dialog.open(SectorDialog, {
      data: { item },
      injector: this.injector,
      panelClass: 'ui-drawer-panel',
      width: 'min(520px, 100vw)',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
    });
  }
}
