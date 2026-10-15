import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { IconComponent } from '@shared/ui/icon/icon.component';

import { NAV_ITEMS } from '../nav.config';

/** Navigation principale : marque, contexte, sections et profil. */
@Component({
  selector: 'sysde-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  /** Émis après un choix de section, pour refermer le tiroir sur mobile. */
  readonly navigated = output<void>();

  protected readonly items = NAV_ITEMS;
}
