import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { CurrentUser } from '@core/auth/current-user';
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

  protected readonly currentUser = inject(CurrentUser);
  /** Un administrateur voit toutes les sections ; les autres, celles qui ne lui sont pas réservées. */
  protected readonly items = computed(() =>
    NAV_ITEMS.filter((item) =>
      item.adminOnly
        ? this.currentUser.isAdministrator()
        : item.managersOnly
          ? this.currentUser.canReport()
          : true,
    ),
  );
}
