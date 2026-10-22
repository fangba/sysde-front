/** Postes qui disposent du menu Planning (la secrétaire l'a en lecture seule). */
export const PLANNING_POSTES: readonly string[] = ['CS', 'CF', 'CO', 'FS', 'MO', 'ES', 'SE'];

/** Postes de terrain : leur dashboard suit leur planning et leurs objectifs annuels. */
export const FIELD_POSTES: readonly string[] = ['CF', 'CO', 'FS', 'MO', 'ES'];

export type DashboardKind = 'field' | 'secretary' | 'standard';

/** Dashboard du collaborateur : terrain (CF, CO, FS, MO, ES), secrétaire (SE) ou standard. */
export function dashboardKind(user: { administrator: boolean; poste?: string }): DashboardKind {
  if (user.administrator || user.poste === undefined) {
    return 'standard';
  }
  if (FIELD_POSTES.includes(user.poste)) {
    return 'field';
  }
  return user.poste === 'SE' ? 'secretary' : 'standard';
}

/** Postes sans le menu Tâches (gestion des comptes) : tous sauf CD et CS. */
export const NO_TASKS_POSTES: readonly string[] = ['SU', 'CF', 'CO', 'FS', 'MO', 'ES', 'SE'];

/** Le menu Tâches est ouvert à tous, sauf aux postes de `NO_TASKS_POSTES`. */
export function canTask(user: { administrator: boolean; poste?: string }): boolean {
  return user.administrator || user.poste === undefined || !NO_TASKS_POSTES.includes(user.poste);
}

/** Le menu Planning est réservé à certains postes ; les administrateurs n'en font pas partie. */
export function canPlan(user: { administrator: boolean; poste?: string }): boolean {
  return !user.administrator && user.poste !== undefined && PLANNING_POSTES.includes(user.poste);
}
