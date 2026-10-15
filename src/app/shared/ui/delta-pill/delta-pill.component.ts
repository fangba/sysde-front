import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Tone } from '@shared/models/tone';
import { formatPercent } from '@shared/util/format';

import { StatusPillComponent } from '../status-pill/status-pill.component';

type Direction = 'up' | 'down' | 'flat';

/** Variation par rapport à la période précédente : triangle, valeur et couleur. */
@Component({
  selector: 'ui-delta-pill',
  imports: [StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-delta-pill' },
  template: `
    <ui-status-pill [tone]="tone()">
      <svg class="triangle" viewBox="0 0 8 8" aria-hidden="true" focusable="false">
        @switch (direction()) {
          @case ('up') {
            <path d="M4 1 7.5 7h-7z" />
          }
          @case ('down') {
            <path d="M4 7 .5 1h7z" />
          }
          @default {
            <path d="M1 3.2h6v1.6H1z" />
          }
        }
      </svg>
      {{ label() }}
      <span class="sr-only">{{ spoken() }}</span>
    </ui-status-pill>
  `,
  styleUrl: './delta-pill.component.scss',
})
export class DeltaPillComponent {
  /** Variation sous forme de fraction : 0,032 pour +3,2 %. */
  readonly value = input.required<number>();

  protected readonly direction = computed<Direction>(() => {
    const rounded = Math.round(this.value() * 1000) / 10;
    return rounded === 0 ? 'flat' : rounded > 0 ? 'up' : 'down';
  });

  protected readonly tone = computed<Tone>(() => {
    const direction = this.direction();
    return direction === 'up' ? 'green' : direction === 'down' ? 'red' : 'neutral';
  });

  protected readonly label = computed(() => formatPercent(Math.abs(this.value())));

  protected readonly spoken = computed(() => {
    const direction = this.direction();
    return direction === 'up' ? 'en hausse' : direction === 'down' ? 'en baisse' : 'stable';
  });
}
