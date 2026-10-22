import { computed, inject } from '@angular/core';

import { CurrentUser } from '@core/auth/current-user';

import { SettingsStore } from '../../settings/state/settings.store';

/**
 * Périmètre du personnel que l'utilisateur connecté peut voir et créer :
 * - chef de département : son opérateur ;
 * - chef secteur : son opérateur et son secteur ;
 * - autres profils : aucune limite (`null`).
 * À appeler dans un contexte d'injection.
 */
export function createStaffScope() {
  const store = inject(SettingsStore);
  const currentUser = inject(CurrentUser);

  const restricted = computed(() => currentUser.isDepartmentHead() || currentUser.isSectorHead());

  const operator = computed(() =>
    restricted() ? store.operatorByAcronym(currentUser.user().operator.acronym) : undefined,
  );
  const sector = computed(() => {
    const code = currentUser.user().sector?.code;
    return currentUser.isSectorHead() && code
      ? store.sectors().find((s) => s.code === code)
      : undefined;
  });

  return {
    restricted,
    /** Opérateur imposé, ou `undefined` si aucune limite (ou données pas encore chargées). */
    operator,
    /** Secteur imposé (chef secteur uniquement). */
    sector,
    isSectorHead: currentUser.isSectorHead,
  };
}
