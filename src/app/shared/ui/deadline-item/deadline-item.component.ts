import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Tone } from '@shared/models/tone';
import { formatDate } from '@shared/util/format';

import { IconTileComponent } from '../icon-tile/icon-tile.component';
import type { IconName } from '../icon/icon.registry';
import { StatusPillComponent } from '../status-pill/status-pill.component';

/** Ligne d'échéance : icône, intitulé, date et délai restant. */
@Component({
  selector: 'ui-deadline-item',
  imports: [IconTileComponent, StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-deadline-item' },
  template: `
    <ui-icon-tile [icon]="icon()" [tone]="tone()" />
    <div class="text">
      <p class="title">{{ title() }}</p>
      <p class="meta">{{ meta() }} · {{ dateLabel() }}</p>
    </div>
    <ui-status-pill [tone]="tone()">{{ remaining() }}</ui-status-pill>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-top: 1px solid var(--line);
    }
    .text {
      flex: 1;
      min-width: 0;
    }
    .title {
      overflow: hidden;
      font-size: 14px;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      margin-top: 2px;
      font-size: 12.5px;
      color: var(--ink-500);
    }
  `,
})
export class DeadlineItemComponent {
  readonly title = input.required<string>();
  readonly meta = input.required<string>();
  /** Date ISO (aaaa-mm-jj). */
  readonly date = input.required<string>();
  readonly daysLeft = input.required<number>();
  readonly icon = input<IconName>('clock');

  protected readonly dateLabel = computed(() => formatDate(this.date()));

  protected readonly tone = computed<Tone>(() => {
    const days = this.daysLeft();
    return days < 0 ? 'red' : days <= 15 ? 'amber' : 'green';
  });

  protected readonly remaining = computed(() => {
    const days = this.daysLeft();
    if (days < 0) {
      return `En retard de ${-days} j`;
    }
    return days === 0 ? "Aujourd'hui" : `Dans ${days} j`;
  });
}
