import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { CurrentUser } from '@core/auth/current-user';
import { IconComponent } from '@shared/ui/icon/icon.component';

import { NAV_ITEMS } from '../nav.config';

/** Navigation principale : marque, contexte, sections et profil. */
@Component({
  selector: 'sysde-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.collapsed]': 'collapsed()' },
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  /** Émis après un choix de section, pour refermer le tiroir sur mobile. */
  readonly navigated = output<void>();
  /** Barre réduite à ses icônes (bureau uniquement ; le tiroir mobile reste complet). */
  readonly collapsed = input(false);
  readonly toggled = output<void>();

  protected readonly currentUser = inject(CurrentUser);
  /** Un administrateur voit toutes les sections ; le superviseur, Dashboard, Reporting et Carte ; les autres, celles qui ne leur sont pas réservées. */
  protected readonly items = computed(() =>
    NAV_ITEMS.filter((item) =>
      item.adminOnly
        ? this.currentUser.isAdministrator()
        : item.hiddenForSupervisor && this.currentUser.isSupervisor()
          ? false
          : item.managersOnly
            ? this.currentUser.canReport()
            : true,
    ),
  );
}
