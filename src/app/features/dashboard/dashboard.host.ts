import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';

import { DashboardPage } from './dashboard.page';
import { FieldDashboardPage } from './team/field-dashboard.page';
import { StaffDashboardPage } from './team/staff-dashboard.page';

/**
 * Choisit le dashboard du profil connecté. Le choix se fait ici, à l'affichage, et non dans la
 * route : une route garde en mémoire son composant, ce qui montrerait le dashboard du compte
 * précédent après un changement de compte sans rechargement.
 */
@Component({
  selector: 'sysde-dashboard-host',
  imports: [DashboardPage, FieldDashboardPage, StaffDashboardPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (currentUser.dashboardKind()) {
      @case ('field') {
        <sysde-field-dashboard />
      }
      @case ('secretary') {
        <sysde-staff-dashboard />
      }
      @default {
        <sysde-dashboard-page />
      }
    }
  `,
})
export class DashboardHost {
  protected readonly currentUser = inject(CurrentUser);
}
