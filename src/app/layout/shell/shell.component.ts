import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { IconComponent } from '@shared/ui/icon/icon.component';
import { ThemeToggleComponent } from '@shared/ui/theme-toggle/theme-toggle.component';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

/** Coque de l'application : barre latérale fixe (tiroir sous 960 px) et zone de contenu. */
@Component({
  selector: 'sysde-shell',
  imports: [RouterOutlet, SidebarComponent, IconComponent, ThemeToggleComponent, UserMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeDrawer()' },
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly drawerOpen = signal(false);

  protected openDrawer(): void {
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
