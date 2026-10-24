import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, computed, inject } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { DataTableComponent, type TableColumn } from '@shared/ui/data-table/data-table.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

import { ACTIVE_TONE, POSTE_LABEL } from '../../settings/data/settings.constants';
import type { User } from '../../settings/data/settings.models';
import { SettingsStore } from '../../settings/state/settings.store';
import { UserDialog } from './users.dialog';

@Component({
  selector: 'sysde-users-tab',
  imports: [ButtonComponent, CardComponent, DataTableComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card
      heading="Utilisateur"
      [subheading]="
        own() ? 'Comptes d’accès de ' + own()!.acronym + '.' : 'Comptes d’accès de votre organisme.'
      "
    >
      <ui-data-table
        [columns]="columns"
        [columnFilters]="true"
        [rows]="users()"
        [loading]="store.status() === 'loading'"
        caption="Liste des comptes utilisateur"
        [rowLabel]="rowLabel"
        searchPlaceholder="Rechercher un utilisateur…"
        emptyTitle="Aucun utilisateur"
        emptyDescription="Créez le premier compte utilisateur."
        (rowEdit)="open($event)"
      >
        <button
          tableActions
          ui-button
          variant="primary"
          type="button"
          [disabled]="!own()"
          (click)="open(null)"
        >
          <ui-icon name="plus" /> Nouveau compte
        </button>
      </ui-data-table>
    </ui-card>
  `,
})
export class UsersTab {
  protected readonly store = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly currentUser = inject(CurrentUser);

  /** Organisme de l'utilisateur connecté (APROMAC ou FIRCA) : seul son personnel est géré ici. */
  protected readonly own = computed(() =>
    this.store.operatorByAcronym(this.currentUser.user().operator.acronym),
  );
  protected readonly users = computed(() => {
    const own = this.own();
    return own ? this.store.users.items().filter((u) => u.operatorId === own.id) : [];
  });

  private readonly injector = inject(Injector);

  protected readonly rowLabel = (u: User) => `${u.firstName} ${u.lastName}`;
  protected readonly columns: readonly TableColumn<User>[] = [
    {
      id: 'matricule',
      filter: 'text',
      header: 'Matricule',
      text: (u) => u.matricule ?? '—',
      nowrap: true,
    },
    {
      id: 'name',
      filter: 'text',
      header: 'Nom',
      text: (u) => `${u.lastName} ${u.firstName}`,
      sub: (u) => u.email,
    },
    {
      id: 'poste',
      filter: 'text',
      header: 'Poste',
      text: (u) => u.poste,
      sub: (u) => POSTE_LABEL[u.poste],
    },
    {
      id: 'active',
      filter: ['Actif', 'Inactif'],
      header: 'Statut',
      text: (u) => (u.active ? 'Actif' : 'Inactif'),
      pill: (u) => ({ label: u.active ? 'Actif' : 'Inactif', tone: ACTIVE_TONE[`${u.active}`] }),
    },
  ];

  protected open(item: User | null): void {
    this.dialog.open(UserDialog, {
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
