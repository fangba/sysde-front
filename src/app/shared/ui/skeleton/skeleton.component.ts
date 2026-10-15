import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Bloc de chargement : conserve la place du contenu pour éviter les sauts de mise en page. */
@Component({
  selector: 'ui-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-skeleton',
    'aria-hidden': 'true',
    '[style.height]': 'height()',
    '[style.width]': 'width()',
  },
  template: ``,
  styles: `
    :host {
      display: block;
      border-radius: var(--radius-md);
      background: linear-gradient(90deg, var(--green-50), var(--green-100), var(--green-50));
      background-size: 200% 100%;
      animation: shimmer 1.4s linear infinite;
    }
    @keyframes shimmer {
      to {
        background-position: -200% 0;
      }
    }
  `,
})
export class SkeletonComponent {
  readonly height = input('16px');
  readonly width = input('100%');
}
