import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { Tone } from '@shared/models/tone';

import { CardComponent } from '../card/card.component';
import { DeltaPillComponent } from '../delta-pill/delta-pill.component';
import { IconTileComponent } from '../icon-tile/icon-tile.component';
import type { IconName } from '../icon/icon.registry';
import { SparklineComponent } from '../sparkline/sparkline.component';

/** Indicateur clé : libellé, grande valeur, variation et tendance. */
@Component({
  selector: 'ui-kpi-card',
  imports: [CardComponent, DeltaPillComponent, IconTileComponent, SparklineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-kpi-card' },
  template: `
    <ui-card>
      <div class="top">
        <ui-icon-tile [icon]="icon()" [tone]="tone()" />
        <ui-delta-pill [value]="delta()" />
      </div>
      <p class="label">{{ label() }}</p>
      <div class="bottom">
        <p class="value">{{ value() }}</p>
        @if (trend().length > 1) {
          <ui-sparkline [values]="trend()" />
        }
      </div>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
    </ui-card>
  `,
  styles: `
    :host {
      display: block;
    }
    ui-card {
      height: 100%;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .label {
      margin-top: 16px;
      font-size: 13px;
      font-weight: 500;
      color: var(--ink-500);
    }
    .bottom {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px;
      margin-top: 6px;
    }
    .value {
      font-size: 28px;
      font-weight: 700;
      white-space: nowrap;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .hint {
      margin-top: 10px;
      font-size: 12px;
      color: var(--ink-500);
    }
  `,
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly delta = input.required<number>();
  readonly icon = input.required<IconName>();
  readonly tone = input<Tone>('green');
  readonly trend = input<readonly number[]>([]);
  readonly hint = input<string>();
}
