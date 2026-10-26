import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, computed, inject } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

import type { Lot } from '../data/settings.models';
import { SettingsStore } from '../state/settings.store';
import { LotDialog } from './lots.dialog';

@Component({
  selector: 'sysde-lots-section',
  imports: [ButtonComponent, CardComponent, DataTableComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card heading="Lots" subheading="Subdivisions numérotées de chaque secteur.">
      <ui-data-table
        [columns]="columns()"
        [columnFilters]="true"
        [rows]="rows()"
        [loading]="store.status() === 'loading'"
        caption="Liste des lots"
        [rowLabel]="rowLabel"
        searchPlaceholder="Rechercher un lot…"
        emptyTitle="Aucun lot"
        emptyDescription="Créez le premier lot d’un secteur."
        (rowEdit)="open($event)"
      >
        <button tableActions ui-button variant="primary" type="button" (click)="open(null)">
          <ui-icon name="plus" /> Nouveau lot
        </button>
      </ui-data-table>
    </ui-card>
  `,
})
export class LotsSection {
  protected readonly store = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  protected readonly rows = computed(() =>
    [...this.store.lots.items()].sort(
      (a, b) =>
        this.store.sectorLabel(a.sectorId).localeCompare(this.store.sectorLabel(b.sectorId)) ||
        a.number - b.number,
    ),
  );

  protected readonly rowLabel = (l: Lot) => `${this.store.sectorLabel(l.sectorId)} lot ${l.number}`;
  /** Les listes de filtre reprennent les valeurs présentes dans le tableau. */
  protected readonly columns = computed<readonly TableColumn<Lot>[]>(() => {
    const rows = this.rows();
    const distinct = (text: (l: Lot) => string) => [...new Set(rows.map(text))];
    return [
      {
        id: 'sector',
        header: 'Secteur',
        text: (l) => this.store.sectorLabel(l.sectorId),
        filter: distinct((l) => this.store.sectorLabel(l.sectorId)),
      },
      {
        id: 'number',
        header: 'Lot',
        text: (l) => `Lot ${l.number}`,
        filter: distinct((l) => `Lot ${l.number}`),
      },
      {
        id: 'description',
        header: 'Description',
        text: (l) => l.description || '—',
        filter: 'text',
      },
    ];
  });

  protected open(item: Lot | null): void {
    this.dialog.open(LotDialog, {
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
