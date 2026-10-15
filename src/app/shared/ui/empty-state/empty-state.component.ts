import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconTileComponent } from '../icon-tile/icon-tile.component';
import type { IconName } from '../icon/icon.registry';

/** État vide ou erreur : icône, message clair, action facultative projetée. */
@Component({
  selector: 'ui-empty-state',
  imports: [IconTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-empty-state' },
  template: `
    <ui-icon-tile [icon]="icon()" [tone]="tone()" />
    <h2 class="title">{{ title() }}</h2>
    @if (description()) {
      <p class="description">{{ description() }}</p>
    }
    <div class="action"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 48px 24px;
      text-align: center;
    }
    ui-icon-tile {
      width: 48px;
      height: 48px;
      --ui-icon-size: 22px;
    }
    .title {
      font-size: 18px;
      font-weight: 600;
    }
    .description {
      max-width: 44ch;
      font-size: 14px;
      color: var(--ink-500);
    }
    .action:empty {
      display: none;
    }
    .action {
      margin-top: 8px;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input<IconName>('inbox');
  readonly tone = input<'green' | 'amber' | 'red'>('green');
  readonly title = input.required<string>();
  readonly description = input<string>();
}
