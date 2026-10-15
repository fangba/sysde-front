import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Carte blanche à ombre douce, avec un en-tête facultatif.
 * Le contenu de `[cardActions]` s'affiche à droite du titre.
 */
@Component({
  selector: 'ui-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-card' },
  template: `
    @if (heading()) {
      <header class="ui-card__head">
        <div>
          <h2 class="ui-card__title">{{ heading() }}</h2>
          @if (subheading()) {
            <p class="ui-card__subtitle">{{ subheading() }}</p>
          }
        </div>
        <div class="ui-card__actions">
          <ng-content select="[cardActions]" />
        </div>
      </header>
    }
    <ng-content />
  `,
  styleUrl: './card.component.scss',
})
export class CardComponent {
  readonly heading = input<string>();
  readonly subheading = input<string>();
}
