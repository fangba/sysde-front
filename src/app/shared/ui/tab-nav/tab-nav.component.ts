import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface TabLink {
  /** Chemin relatif de la route enfant. */
  readonly path: string;
  readonly label: string;
}

/**
 * Onglets de navigation (une route par onglet), figés sous la barre d'outils de l'application.
 * La page hôte fournit `--sticky-top` (hauteur de la barre) et `--tabs-height`.
 */
@Component({
  selector: 'ui-tab-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-tab-nav', role: 'navigation', '[attr.aria-label]': 'label()' },
  template: `
    @for (tab of tabs(); track tab.path) {
      <a [routerLink]="tab.path" routerLinkActive="active" ariaCurrentWhenActive="page">{{
        tab.label
      }}</a>
    }
  `,
  styleUrl: './tab-nav.component.scss',
})
export class TabNavComponent {
  readonly tabs = input.required<readonly TabLink[]>();
  readonly label = input('Sections');
}
