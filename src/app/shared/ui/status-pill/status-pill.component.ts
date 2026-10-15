import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { Tone } from '@shared/models/tone';

/** Pastille de statut : le texte est projeté, la teinte donne la gravité. */
@Component({
  selector: 'ui-status-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-status-pill', '[attr.data-tone]': 'tone()' },
  template: `<ng-content />`,
  styleUrl: './status-pill.component.scss',
})
export class StatusPillComponent {
  readonly tone = input<Tone>('neutral');
}
