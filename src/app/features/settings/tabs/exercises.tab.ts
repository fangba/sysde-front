import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';

import { Clock } from '@core/time/clock';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { todayIso } from '@shared/util/dates';
import { formatDate } from '@shared/util/format';

import type { Exercise } from '../data/settings.models';
import { lotsLabel } from '../data/settings.rules';
import { SettingsStore } from '../state/settings.store';
import { ExerciseDialog } from './exercises.dialog';

@Component({
  selector: 'sysde-exercises-tab',
  imports: [ButtonComponent, CardComponent, DataTableComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card heading="Exercices" subheading="Exercices annuels par contrat et par attribution.">
      <ui-data-table
        [columns]="columns"
        [rows]="rows()"
        [loading]="store.status() === 'loading'"
        caption="Liste des exercices"
        [rowLabel]="rowLabel"
        searchPlaceholder="Rechercher un exercice…"
        emptyTitle="Aucun exercice"
        emptyDescription="Créez le premier exercice d’un contrat."
        (rowEdit)="open($event)"
      >
        <button tableActions ui-button variant="primary" type="button" (click)="open(null)">
          <ui-icon name="plus" /> Nouvel exercice
        </button>
      </ui-data-table>
    </ui-card>
  `,
})
export class ExercisesTab {
  protected readonly store = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly clock = inject(Clock);

  protected readonly rows = () => [...this.store.exercises.items()].sort((a, b) => b.year - a.year);

  protected readonly rowLabel = (e: Exercise) =>
    `${e.year} ${this.store.sectorLabel(e.sectorId)} ${this.lotLabel(e)}`;
  protected readonly columns: readonly TableColumn<Exercise>[] = [
    { id: 'year', header: 'Exercice', text: (e) => String(e.year) },
    { id: 'sector', header: 'Secteur', text: (e) => this.store.sectorLabel(e.sectorId) },
    { id: 'lots', header: 'Lots', text: (e) => this.lotLabel(e) },
    { id: 'contract', header: 'Contrat', text: (e) => this.store.contractLabel(e.contractId) },
    { id: 'closing', header: 'Clôture', text: (e) => formatDate(e.closingDate) },
    {
      id: 'status',
      header: 'Statut',
      text: (e) => (this.isClosed(e) ? 'Clôturé' : 'Ouvert'),
      pill: (e) => ({
        label: this.isClosed(e) ? 'Clôturé' : 'Ouvert',
        tone: this.isClosed(e) ? 'neutral' : 'green',
      }),
    },
  ];

  private lotLabel(e: Exercise): string {
    const lots = this.store.attributions.items().find((a) => a.id === e.attributionId)?.lots;
    return lots ? lotsLabel(lots) : '—';
  }

  private isClosed(exercise: Exercise): boolean {
    return todayIso(this.clock.now()) > exercise.closingDate;
  }

  protected open(item: Exercise | null): void {
    this.dialog.open(ExerciseDialog, {
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
