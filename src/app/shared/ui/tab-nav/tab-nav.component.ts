import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface TabLink {
  /** Chemin relatif de la route enfant. */
  readonly path: string;
  readonly label: string;
  /** Nombre d'éléments en attente, affiché en pastille (masqué à 0). */
  readonly badge?: number;
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
      <a [routerLink]="tab.path" routerLinkActive="active" ariaCurrentWhenActive="page"
        >{{ tab.label }}
        @if (tab.badge) {
          <span class="badge">{{ tab.badge }}<span class="sr-only"> en attente</span></span>
        }
      </a>
    }
  `,
  styleUrl: './tab-nav.component.scss',
})
export class TabNavComponent {
  readonly tabs = input.required<readonly TabLink[]>();
  readonly label = input('Sections');
}
