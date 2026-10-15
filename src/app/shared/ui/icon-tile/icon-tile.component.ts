import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { Tone } from '@shared/models/tone';

import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/icon.registry';

/** Tuile carrée de 36 px qui porte une icône, teintée selon la catégorie. */
@Component({
  selector: 'ui-icon-tile',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-icon-tile', '[attr.data-tone]': 'tone()' },
  template: `<ui-icon [name]="icon()" />`,
  styleUrl: './icon-tile.component.scss',
})
export class IconTileComponent {
  readonly icon = input.required<IconName>();
  readonly tone = input<Tone>('green');
}
