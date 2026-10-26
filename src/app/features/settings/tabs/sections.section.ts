import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, computed, inject } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

import type { Lot, Section } from '../data/settings.models';
import { SettingsStore } from '../state/settings.store';
import { SectionDialog } from './sections.dialog';

/**
 * Lots que l'utilisateur peut subdiviser : pour un chef secteur, les lots de son secteur confiés à
 * son opérateur ; pour un administrateur, tous les lots.
 */
export function ownLots(store: SettingsStore, currentUser: CurrentUser): readonly Lot[] {
  if (!currentUser.isSectorHead()) {
    return store.lots.items();
  }
  const user = currentUser.user();
  const sector = store.sectors().find((s) => s.code === user.sector?.code);
  if (!sector) {
    return [];
  }
  return store.lotsOfOperator(sector.id, store.operatorByAcronym(user.operator.acronym)?.id);
}

@Component({
  selector: 'sysde-sections-section',
  imports: [ButtonComponent, CardComponent, DataTableComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card
      heading="Sections"
      [subheading]="
        sectorHead() ? 'Subdivisions des lots de votre secteur.' : 'Subdivisions de chaque lot.'
      "
    >
      <ui-data-table
        [columns]="columns()"
        [columnFilters]="true"
        [rows]="rows()"
        [loading]="store.status() === 'loading'"
        caption="Liste des sections"
        [rowLabel]="rowLabel"
        searchPlaceholder="Rechercher une section…"
        emptyTitle="Aucune section"
        emptyDescription="Créez et nommez la première section d’un de vos lots."
        (rowEdit)="open($event)"
      >
        <button tableActions ui-button variant="primary" type="button" (click)="open(null)">
          <ui-icon name="plus" /> Nouvelle section
        </button>
      </ui-data-table>
    </ui-card>
  `,
})
export class SectionsSection {
  protected readonly store = inject(SettingsStore);
  private readonly currentUser = inject(CurrentUser);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  protected readonly sectorHead = this.currentUser.isSectorHead;

  private readonly lotIds = computed(
    () => new Set(ownLots(this.store, this.currentUser).map((l) => l.id)),
  );

  protected readonly rows = computed(() =>
    this.store.sections
      .items()
      .filter((s) => this.lotIds().has(s.lotId))
      .sort(
        (a, b) =>
          this.store.lotLabel(a.lotId).localeCompare(this.store.lotLabel(b.lotId), 'fr') ||
          a.name.localeCompare(b.name, 'fr'),
      ),
  );

  protected readonly rowLabel = (s: Section) => `${this.store.lotLabel(s.lotId)} section ${s.name}`;
  /** La liste de filtre des lots reprend ceux qui ont déjà des sections. */
  protected readonly columns = computed<readonly TableColumn<Section>[]>(() => [
    {
      id: 'lot',
      header: 'Lot',
      text: (s) => this.store.lotLabel(s.lotId),
      filter: [...new Set(this.rows().map((s) => this.store.lotLabel(s.lotId)))],
    },
    { id: 'name', header: 'Section', text: (s) => s.name, filter: 'text' },
    { id: 'description', header: 'Description', text: (s) => s.description || '—', filter: 'text' },
  ]);

  protected open(item: Section | null): void {
    this.dialog.open(SectionDialog, {
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
