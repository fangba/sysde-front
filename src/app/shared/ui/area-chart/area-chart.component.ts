import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { CHART_COLOR_VAR, type ChartTone } from '@shared/models/tone';
import { areaPath, monotonePath, type Point } from '@shared/util/curves';
import { observeSize } from '@shared/util/element-size';
import { formatInteger } from '@shared/util/format';
import { uniqueId } from '@shared/util/ids';
import { niceScale } from '@shared/util/scale';

export interface AreaSeries {
  readonly name: string;
  readonly tone: ChartTone;
  readonly values: readonly number[];
}

interface Layout {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

const HEIGHT = 300;

/**
 * Graphique en aires lissées, dessiné à la main en SVG (aucune dépendance).
 * Accessible : tableau équivalent pour lecteurs d'écran, navigation aux flèches.
 */
@Component({
  selector: 'ui-area-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-area-chart',
    role: 'group',
    tabindex: '0',
    '[attr.aria-label]': 'ariaLabel()',
    '(keydown)': 'onKeydown($event)',
    '(blur)': 'active.set(null)',
    '(pointerleave)': 'active.set(null)',
    '(pointermove)': 'onPointerMove($event)',
  },
  template: `
    @if (layout().width > 0) {
      <svg
        [attr.viewBox]="'0 0 ' + layout().width + ' ' + layout().height"
        [attr.width]="layout().width"
        [attr.height]="layout().height"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          @for (shape of shapes(); track shape.name) {
            <linearGradient [attr.id]="shape.gradientId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" [attr.stop-color]="shape.color" stop-opacity="0.28" />
              <stop offset="1" [attr.stop-color]="shape.color" stop-opacity="0" />
            </linearGradient>
          }
        </defs>

        @for (tick of ticks(); track tick.value) {
          <line
            class="grid"
            [attr.x1]="layout().left"
            [attr.x2]="layout().width - layout().right"
            [attr.y1]="tick.y"
            [attr.y2]="tick.y"
          />
          <text class="axis" text-anchor="end" [attr.x]="layout().left - 10" [attr.y]="tick.y + 4">
            {{ tick.label }}
          </text>
        }

        @for (label of xLabels(); track label.index) {
          <text class="axis" text-anchor="middle" [attr.x]="label.x" [attr.y]="layout().height - 8">
            {{ label.text }}
          </text>
        }

        @for (shape of shapes(); track shape.name; let first = $first) {
          @if (first) {
            <path [attr.d]="shape.area" [attr.fill]="'url(#' + shape.gradientId + ')'" />
          }
          <path class="line" [attr.d]="shape.line" [attr.stroke]="shape.color" />
        }

        @if (cursor(); as c) {
          <line
            class="cursor"
            [attr.x1]="c.x"
            [attr.x2]="c.x"
            [attr.y1]="layout().top"
            [attr.y2]="layout().height - layout().bottom"
          />
          @for (dot of c.dots; track dot.name) {
            <circle class="dot" [attr.cx]="c.x" [attr.cy]="dot.y" r="5" [attr.stroke]="dot.color" />
          }
        }
      </svg>

      @if (cursor(); as c) {
        <div class="tip" [style.left.px]="c.tipLeft" [style.top.px]="layout().top">
          <p class="tip__title">{{ c.label }}</p>
          @for (dot of c.dots; track dot.name) {
            <p class="tip__row">
              <span class="tip__swatch" [style.background]="dot.color"></span>
              <span class="tip__name">{{ dot.name }}</span>
              <strong>{{ dot.text }}</strong>
            </p>
          }
        </div>
      }
    }

    <table class="sr-only">
      <caption>
        {{
          ariaLabel()
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Période</th>
          @for (s of series(); track s.name) {
            <th scope="col">{{ s.name }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (label of labels(); track $index; let row = $index) {
          <tr>
            <th scope="row">{{ label }}</th>
            @for (s of series(); track s.name) {
              <td>{{ format(s.values[row]) }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styleUrl: './area-chart.component.scss',
})
export class AreaChartComponent {
  readonly labels = input.required<readonly string[]>();
  readonly series = input.required<readonly AreaSeries[]>();
  readonly ariaLabel = input.required<string>();
  /** Unité ajoutée aux valeurs de l'infobulle (ex. « t »). */
  readonly unit = input('');
  /** Valeur minimale du haut de l'axe : évite des graduations décimales pour de petits effectifs. */
  readonly minTop = input(0);

  protected readonly active = signal<number | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly size = observeSize(this.host);
  private readonly idPrefix = uniqueId('area');

  protected readonly layout = computed<Layout>(() => ({
    width: this.size().width,
    height: HEIGHT,
    left: 48,
    right: 12,
    top: 12,
    bottom: 30,
  }));

  private readonly scale = computed(() => {
    const max = Math.max(0, ...this.series().flatMap((s) => s.values));
    return niceScale(Math.max(max, this.minTop()), 4);
  });

  private readonly plot = computed(() => {
    const l = this.layout();
    return {
      x0: l.left,
      x1: l.width - l.right,
      y0: l.height - l.bottom,
      y1: l.top,
    };
  });

  private xAt(index: number): number {
    const { x0, x1 } = this.plot();
    const count = this.labels().length;
    return count <= 1 ? (x0 + x1) / 2 : x0 + (index / (count - 1)) * (x1 - x0);
  }

  private yAt(value: number): number {
    const { y0, y1 } = this.plot();
    return y0 - (value / this.scale().max) * (y0 - y1);
  }

  protected readonly shapes = computed(() =>
    this.series().map((s, seriesIndex) => {
      const points: Point[] = s.values.map((v, i): Point => [this.xAt(i), this.yAt(v)]);
      const line = monotonePath(points);
      return {
        name: s.name,
        color: CHART_COLOR_VAR[s.tone],
        gradientId: `${this.idPrefix}-${seriesIndex}`,
        line,
        area: areaPath(line, points, this.plot().y0),
      };
    }),
  );

  protected readonly ticks = computed(() =>
    this.scale().ticks.map((value) => ({
      value,
      y: this.yAt(value),
      label: formatInteger(value),
    })),
  );

  /** Étiquettes de l'axe horizontal, espacées pour rester lisibles. */
  protected readonly xLabels = computed(() => {
    const labels = this.labels();
    const available = this.plot().x1 - this.plot().x0;
    const every = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(available / 64))));
    return labels
      .map((text, index) => ({ text, index, x: this.xAt(index) }))
      .filter((label) => label.index % every === 0);
  });

  protected readonly cursor = computed(() => {
    const index = this.active();
    if (index === null) {
      return null;
    }
    const x = this.xAt(index);
    const width = this.layout().width;
    const tipWidth = 190;
    return {
      x,
      label: this.labels()[index] ?? '',
      tipLeft: Math.min(Math.max(x + 14, 0), Math.max(0, width - tipWidth)),
      dots: this.series().map((s) => {
        const value = s.values[index] ?? 0;
        return {
          name: s.name,
          color: CHART_COLOR_VAR[s.tone],
          y: this.yAt(value),
          text: this.format(value),
        };
      }),
    };
  });

  protected format(value: number): string {
    const unit = this.unit();
    return unit ? `${formatInteger(value)} ${unit}` : formatInteger(value);
  }

  protected onPointerMove(event: PointerEvent): void {
    const count = this.labels().length;
    if (count === 0) {
      return;
    }
    const rect = this.host.nativeElement.getBoundingClientRect();
    const { x0, x1 } = this.plot();
    const ratio = (event.clientX - rect.left - x0) / Math.max(1, x1 - x0);
    this.active.set(Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1)))));
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.labels().length;
    if (count === 0) {
      return;
    }
    const current = this.active();
    switch (event.key) {
      case 'ArrowRight':
        this.active.set(current === null ? 0 : Math.min(count - 1, current + 1));
        break;
      case 'ArrowLeft':
        this.active.set(current === null ? count - 1 : Math.max(0, current - 1));
        break;
      case 'Home':
        this.active.set(0);
        break;
      case 'End':
        this.active.set(count - 1);
        break;
      case 'Escape':
        this.active.set(null);
        return;
      default:
        return;
    }
    event.preventDefault();
  }
}
