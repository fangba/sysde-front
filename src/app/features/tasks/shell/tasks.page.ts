import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TabNavComponent, type TabLink } from '@shared/ui/tab-nav/tab-nav.component';

import { SettingsStore } from '../../settings/state/settings.store';

export const TASKS_TABS: readonly TabLink[] = [
  { path: 'utilisateurs', label: 'Utilisateur' },
  { path: 'chefs-departement', label: 'Chef département' },
  { path: 'chefs-secteur', label: 'Chef secteur' },
  { path: 'collaborateurs', label: 'Collaborateur' },
];

/** Coque de l'écran Tâches : onglets + contenu de l'onglet actif. */
@Component({
  selector: 'sysde-tasks-page',
  imports: [
    RouterOutlet,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    TabNavComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header
      title="Tâches"
      subtitle="Comptes de votre organisme et personnel des opérateurs d’encadrement."
    />

    <ui-tab-nav [tabs]="tabs" label="Sections des tâches" />

    @if (store.status() === 'error') {
      <ui-card>
        <ui-empty-state
          icon="alert"
          tone="red"
          title="Chargement impossible"
          [description]="store.error()"
        >
          <button ui-button variant="primary" type="button" (click)="store.load()">
            Réessayer
          </button>
        </ui-empty-state>
      </ui-card>
    } @else {
      <router-outlet />
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
      --sticky-top: var(--app-bar-height, 0px);
      --tabs-height: 49px;
    }

    // Le <router-outlet> n'est qu'un repère : sans cela il compte comme un élément de la colonne
    // et double l'espace entre les onglets et le contenu.
    router-outlet {
      display: none;
    }
  `,
})
export class TasksPage {
  protected readonly store = inject(SettingsStore);
  protected readonly tabs = TASKS_TABS;

  constructor() {
    this.store.load();
  }
}
