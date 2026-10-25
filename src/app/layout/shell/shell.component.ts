import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { IconComponent } from '@shared/ui/icon/icon.component';
import { ThemeToggleComponent } from '@shared/ui/theme-toggle/theme-toggle.component';

import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

const COLLAPSED_KEY = 'sysde-sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Coque de l'application : barre latérale fixe (tiroir sous 960 px) et zone de contenu. */
@Component({
  selector: 'sysde-shell',
  imports: [
    RouterOutlet,
    SidebarComponent,
    IconComponent,
    NotificationBellComponent,
    ThemeToggleComponent,
    UserMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeDrawer()', '[class.collapsed]': 'collapsed()' },
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly drawerOpen = signal(false);
  protected readonly collapsed = signal(readCollapsed());

  protected toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(this.collapsed()));
    } catch {
      // Stockage indisponible : la préférence vaut pour cette session seulement.
    }
  }

  protected openDrawer(): void {
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
