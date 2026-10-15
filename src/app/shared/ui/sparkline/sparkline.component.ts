import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { monotonePath, type Point } from '@shared/util/curves';

const WIDTH = 96;
const HEIGHT = 32;
const PAD = 3;

/** Mini-courbe de tendance, décorative : la valeur est toujours donnée en texte à côté. */
@Component({
  selector: 'ui-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-sparkline', 'aria-hidden': 'true' },
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      preserveAspectRatio="none"
      focusable="false"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
      width: 96px;
      height: 32px;
    }
    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    path {
      fill: none;
      stroke: var(--spark-green);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class SparklineComponent {
  readonly values = input.required<readonly number[]>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;

  protected readonly path = computed(() => {
    const values = this.values();
    if (values.length < 2) {
      return '';
    }
    const min = Math.min(...values);
    const range = Math.max(...values) - min || 1;
    const step = (WIDTH - PAD * 2) / (values.length - 1);
    const points: Point[] = values.map((value, index): Point => [
      PAD + index * step,
      HEIGHT - PAD - ((value - min) / range) * (HEIGHT - PAD * 2),
    ]);
    return monotonePath(points);
  });
}
