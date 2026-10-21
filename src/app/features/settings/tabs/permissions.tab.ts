import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';

import { GRANTABLE_POSTES, PERMISSIONS, PERMISSION_SECTIONS } from '../data/permissions.catalog';
import { POSTE_LABEL } from '../data/settings.constants';
import type { Poste } from '../data/settings.models';
import { PermissionsStore } from '../state/permissions.store';

/**
 * Droits par poste : une ligne par droit (voir ou faire), une colonne par poste.
 * Les modifications restent locales jusqu'à « Enregistrer ».
 */
@Component({
  selector: 'sysde-permissions-tab',
  imports: [ButtonComponent, CardComponent, EmptyStateComponent, IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permissions.tab.html',
  styleUrl: './permissions.tab.scss',
})
export class PermissionsTab {
  protected readonly store = inject(PermissionsStore);

  protected readonly postes = GRANTABLE_POSTES;
  protected readonly posteLabel = POSTE_LABEL;
  protected readonly groups = PERMISSION_SECTIONS.map((section) => ({
    ...section,
    permissions: PERMISSIONS.filter((permission) => permission.section === section.id),
  }));
  protected readonly total = PERMISSIONS.length;
  protected readonly placeholderRows = [0, 1, 2, 3, 4, 5];

  constructor() {
    this.store.load();
  }

  protected toggle(poste: Poste, code: string): void {
    this.store.toggle(poste, code);
  }
}
