import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';

import { SettingsStore } from '../state/settings.store';

export const SETTINGS_TABS = [
  { path: 'operateurs', label: 'Opérateurs' },
  { path: 'contrats', label: 'Contrats' },
  { path: 'attribution', label: 'Attribution' },
  { path: 'exercices', label: 'Exercice' },
  { path: 'utilisateurs', label: 'Utilisateur' },
] as const;

/** Coque de l'écran Paramètres : onglets + contenu de l'onglet actif. */
@Component({
  selector: 'sysde-settings-page',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header
      title="Paramètres"
      subtitle="Opérateurs, contrats, attributions, exercices et comptes utilisateur."
    />

    <nav class="tabs" aria-label="Sections des paramètres">
      @for (tab of tabs; track tab.path) {
        <a [routerLink]="tab.path" routerLinkActive="active" ariaCurrentWhenActive="page">{{
          tab.label
        }}</a>
      }
    </nav>

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
  protected readonly tabs = SETTINGS_TABS;

  constructor() {
    this.store.load();
  }
}
