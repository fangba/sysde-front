import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CurrentUser } from '@core/auth/current-user';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { TabNavComponent, type TabLink } from '@shared/ui/tab-nav/tab-nav.component';

import { SettingsStore } from '../state/settings.store';

export const SETTINGS_TABS: readonly TabLink[] = [
  { path: 'operateurs', label: 'Opérateurs' },
  { path: 'contrats', label: 'Contrats' },
  { path: 'attribution', label: 'Attributions' },
  { path: 'exercices', label: 'Exercices' },
  { path: 'activites', label: 'Activités' },
  { path: 'permissions', label: 'Permissions' },
  { path: 'references', label: 'Références' },
];

/** Coque de l'écran Paramètres : onglets + contenu de l'onglet actif. */
@Component({
  selector: 'sysde-settings-page',
  imports: [
    RouterOutlet,
    TabNavComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Paramètres" [subtitle]="subtitle()" />

    <ui-tab-nav [tabs]="tabs()" label="Sections des paramètres" />

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
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  protected readonly store = inject(SettingsStore);
  private readonly currentUser = inject(CurrentUser);

  /** L'administrateur a tous les onglets ; le chef secteur, uniquement Références. */
  protected readonly tabs = computed(() =>
    this.currentUser.isAdministrator()
      ? SETTINGS_TABS
      : SETTINGS_TABS.filter((tab) => tab.path === 'references'),
  );
  protected readonly subtitle = computed(() =>
    this.currentUser.isAdministrator()
      ? 'Opérateurs, contrats, attributions, exercices, activités, permissions et références.'
      : 'Sections des lots de votre secteur.',
  );

  constructor() {
    this.store.load();
  }
}
