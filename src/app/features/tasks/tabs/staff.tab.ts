import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  computed,
  inject,
  input,
} from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

import { ACTIVE_TONE, POSTE_LABEL } from '../../settings/data/settings.constants';
import type { User } from '../../settings/data/settings.models';
import { SettingsStore } from '../../settings/state/settings.store';
import { StaffDialog } from './staff.dialog';
import { STAFF_CONFIG, type StaffKind } from './staff.config';
import { createStaffScope } from './staff.scope';

/**
 * Liste du personnel d'un opérateur technique. Un même composant sert les trois onglets
 * (chef département, chef secteur, collaborateur) ; la catégorie vient des données de la route.
 */
@Component({
  selector: 'sysde-staff-tab',
  imports: [ButtonComponent, CardComponent, DataTableComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card [heading]="config().heading" [subheading]="config().subheading">
      <ui-data-table
        [columns]="columns()"
        [rows]="rows()"
        [loading]="store.status() === 'loading'"
        [columnFilters]="true"
        [caption]="'Liste : ' + config().heading"
        [rowLabel]="rowLabel"
        [searchPlaceholder]="'Rechercher : ' + config().singular + '…'"
        [emptyTitle]="'Aucun ' + config().singular"
        [emptyDescription]="'Créez le premier ' + config().singular + '.'"
        (rowEdit)="open($event)"
      >
        <button tableActions ui-button variant="primary" type="button" (click)="open(null)">
          <ui-icon name="plus" /> {{ config().newLabel }}
        </button>
      </ui-data-table>
    </ui-card>
  `,
})
export class StaffTab {
  readonly kind = input.required<StaffKind>();

  protected readonly store = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);

  private readonly scope = createStaffScope();
  protected readonly config = computed(() => STAFF_CONFIG[this.kind()]);

  protected readonly rows = computed(() => {
    const { postes } = this.config();
    const { restricted, operator, sector, isSectorHead } = this.scope;
    return this.store.users.items().filter((u) => {
      if (!postes.includes(u.poste)) {
        return false;
      }
      if (!restricted()) {
        return true;
      }
      // Tant que le périmètre n'est pas connu, rien n'est affiché.
      return u.operatorId === operator()?.id && (!isSectorHead() || u.sectorId === sector()?.id);
    });
  });

  protected readonly rowLabel = (u: User) => `${u.firstName} ${u.lastName}`;

  protected readonly columns = computed<readonly TableColumn<User>[]>(() => {
    const { postes, sector, assignment, showMatricule } = this.config();
    // Un chef secteur ne voit que son opérateur et son secteur : ces colonnes seraient constantes.
    const fixedScope = this.scope.isSectorHead();
    const name: TableColumn<User> = {
      id: 'name',
      filter: 'text',
      header: 'Nom',
      text: (u) => `${u.lastName} ${u.firstName}`,
      sub: (u) => u.email,
    };
    const matricule: TableColumn<User> = {
      id: 'matricule',
      filter: 'text',
      header: 'Matricule',
      text: (u) => u.matricule ?? '—',
      nowrap: true,
    };
    const operator: TableColumn<User> = {
      id: 'operator',
      filter: 'text',
      header: 'Opérateur',
      text: (u) => this.store.operatorLabel(u.operatorId),
      sub: (u) => this.store.operatorOf(u.operatorId)?.name ?? '',
    };
    const poste: TableColumn<User> = {
      id: 'poste',
      filter: 'text',
      header: 'Poste',
      text: (u) => u.poste,
      sub: (u) => POSTE_LABEL[u.poste],
    };
    const sectorColumn: TableColumn<User> = {
      id: 'sector',
      filter: 'text',
      header: 'Secteur',
      text: (u) => (u.sectorId ? this.store.sectorLabel(u.sectorId) : '—'),
    };
    const lot: TableColumn<User> = {
      id: 'lot',
      filter: 'text',
      header: 'Lot',
      text: (u) => (u.lot === undefined ? '—' : `Lot ${u.lot}`),
      nowrap: true,
    };
    const section: TableColumn<User> = {
      id: 'section',
      filter: 'text',
      header: 'Section',
      text: (u) => u.section || '—',
    };
    const active: TableColumn<User> = {
      id: 'active',
      filter: ['Actif', 'Inactif'],
      header: 'Statut',
      text: (u) => (u.active ? 'Actif' : 'Inactif'),
      pill: (u) => ({ label: u.active ? 'Actif' : 'Inactif', tone: ACTIVE_TONE[`${u.active}`] }),
    };

    if (assignment) {
      // Matricule, Nom, Poste, Lot, Section, Statut ; l'opérateur et le secteur ne s'ajoutent
      // que pour ceux qui voient plusieurs opérateurs ou secteurs.
      return [
        matricule,
        name,
        poste,
        ...(fixedScope ? [] : [operator, sectorColumn]),
        lot,
        section,
        active,
      ];
    }
    return [
      ...(showMatricule ? [matricule] : []),
      name,
      // Un chef de département ne voit que son opérateur : la colonne serait constante.
      ...(this.scope.restricted() ? [] : [operator]),
      ...(postes.length > 1 ? [poste] : []),
      ...(sector !== 'none' ? [sectorColumn] : []),
      active,
    ];
  });

  protected open(item: User | null): void {
    this.dialog.open(StaffDialog, {
      data: { item, kind: this.kind() },
      injector: this.injector,
      panelClass: 'ui-drawer-panel',
      width: 'min(520px, 100vw)',
      height: '100%',
      maxHeight: '100vh',
      backdropClass: 'ui-dialog-backdrop',
    });
  }
}
