import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CHART_COLOR_VAR, type ChartTone } from '@shared/models/tone';
import { formatInteger, formatPercentRounded } from '@shared/util/format';

export interface DonutSlice {
  readonly name: string;
  readonly value: number;
  readonly tone: ChartTone;
}

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3;

/** Anneau de répartition avec total au centre et légende chiffrée. */
@Component({
  selector: 'ui-donut',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-donut' },
  template: `
    <figure class="figure">
      <svg viewBox="0 0 140 140" role="img" [attr.aria-label]="ariaLabel()" focusable="false">
        <circle class="track" cx="70" cy="70" [attr.r]="radius" />
        @for (arc of arcs(); track arc.name) {
          <circle
            class="arc"
            cx="70"
            cy="70"
            [attr.r]="radius"
            [attr.stroke]="arc.color"
            [attr.stroke-dasharray]="arc.dash"
            [attr.stroke-dashoffset]="arc.offset"
          />
        }
        <text class="total" x="70" y="68" text-anchor="middle">{{ totalLabel() }}</text>
        <text class="caption" x="70" y="86" text-anchor="middle">{{ caption() }}</text>
      </svg>
      <figcaption class="legend">
        @for (arc of arcs(); track arc.name) {
          <p class="row">
            <span class="swatch" [style.background]="arc.color"></span>
            <span class="name">{{ arc.name }}</span>
            <strong>{{ arc.share }}</strong>
          </p>
        }
      </figcaption>
    </figure>
  `,
  styleUrl: './donut.component.scss',
})
export class DonutComponent {
  readonly slices = input.required<readonly DonutSlice[]>();
  readonly ariaLabel = input.required<string>();
  readonly caption = input('Total');

  protected readonly radius = RADIUS;

  private readonly total = computed(() => this.slices().reduce((sum, s) => sum + s.value, 0));
  protected readonly totalLabel = computed(() => formatInteger(this.total()));

  protected readonly arcs = computed(() => {
    const total = this.total();
    let consumed = 0;
    return this.slices().map((slice) => {
      const fraction = total > 0 ? slice.value / total : 0;
      const length = Math.max(0, fraction * CIRCUMFERENCE - GAP);
      const arc = {
        name: slice.name,
        color: CHART_COLOR_VAR[slice.tone],
        dash: `${length} ${CIRCUMFERENCE - length}`,
        offset: -consumed,
        share: formatPercentRounded(fraction),
      };
      consumed += fraction * CIRCUMFERENCE;
      return arc;
    });
  });
}
