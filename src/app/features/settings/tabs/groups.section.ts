import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, computed, inject } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

import type { Group } from '../data/settings.models';
import { SettingsStore } from '../state/settings.store';
import { GroupDialog } from './groups.dialog';
import { ownLots } from './sections.section';

/** Groupes de vulgarisation des lots du secteur, gérés par le chef secteur. */
@Component({
  selector: 'sysde-groups-section',
  imports: [ButtonComponent, CardComponent, DataTableComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card heading="Groupes" subheading="Groupes de vulgarisation, chacun géré par un moniteur.">
      <ui-data-table
        [columns]="columns()"
        [columnFilters]="true"
        [rows]="rows()"
        [loading]="store.status() === 'loading'"
        caption="Liste des groupes"
        [rowLabel]="rowLabel"
        searchPlaceholder="Rechercher un groupe, un village, un délégué…"
        emptyTitle="Aucun groupe"
        emptyDescription="Créez d’abord une section, puis son premier groupe de vulgarisation."
        (rowEdit)="open($event)"
      >
        <button tableActions ui-button variant="primary" type="button" (click)="open(null)">
          <ui-icon name="plus" /> Nouveau groupe
        </button>
      </ui-data-table>
    </ui-card>
  `,
})
export class GroupsSection {
  protected readonly store = inject(SettingsStore);
  private readonly currentUser = inject(CurrentUser);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  private readonly lotIds = computed(
    () => new Set(ownLots(this.store, this.currentUser).map((l) => l.id)),
  );

  protected readonly rows = computed(() =>
    this.store.groups
      .items()
      .filter((g) => this.lotIds().has(g.lotId))
      .sort(
        (a, b) =>
          this.store.lotLabel(a.lotId).localeCompare(this.store.lotLabel(b.lotId), 'fr') ||
          this.store
            .sectionName(a.sectionId)
            .localeCompare(this.store.sectionName(b.sectionId), 'fr') ||
          a.name.localeCompare(b.name, 'fr'),
      ),
  );

  protected readonly rowLabel = (g: Group) => `groupe ${g.name}`;

  protected readonly columns = computed<readonly TableColumn<Group>[]>(() => {
    const distinct = (text: (g: Group) => string) => [...new Set(this.rows().map(text))];
    const lot = (g: Group) => this.store.lotLabel(g.lotId);
    const section = (g: Group) => this.store.sectionName(g.sectionId);
    const monitor = (g: Group) => this.store.userName(g.monitorId);
    return [
      { id: 'lot', header: 'Lot', text: lot, filter: distinct(lot) },
      { id: 'section', header: 'Section', text: section, filter: distinct(section) },
      { id: 'name', header: 'Groupe', text: (g) => g.name, filter: 'text' },
      { id: 'village', header: 'Village', text: (g) => g.village || '—', filter: 'text' },
      { id: 'delegate', header: 'Délégué', text: (g) => g.delegate || '—', filter: 'text' },
      { id: 'monitor', header: 'Moniteur', text: monitor, filter: distinct(monitor) },
    ];
  });

  protected open(item: Group | null): void {
    this.dialog.open(GroupDialog, {
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
