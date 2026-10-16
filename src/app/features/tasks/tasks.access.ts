/** Onglets du menu Tâches et profils qui y ont accès. */
export interface TasksTabDef {
  readonly path: string;
  readonly label: string;
}

export const TASKS_TAB_DEFS: readonly TasksTabDef[] = [
  { path: 'utilisateurs', label: 'Utilisateur' },
  { path: 'chefs-departement', label: 'Chef département' },
  { path: 'chefs-secteur', label: 'Chef secteur' },
  { path: 'collaborateurs', label: 'Collaborateur' },
];

export interface TasksProfile {
  readonly administrator: boolean;
  readonly departmentHead: boolean;
  readonly sectorHead: boolean;
}

/**
 * Onglets visibles selon le profil :
 * - administrateur : Utilisateur et Chef département ;
 * - chef de département : Chef secteur uniquement ;
 * - chef de secteur : Collaborateur uniquement ;
 * - autres comptes : tous les onglets.
 */
export function tasksTabsFor(profile: TasksProfile): readonly TasksTabDef[] {
  const allowed = profile.administrator
    ? ['utilisateurs', 'chefs-departement']
    : profile.departmentHead
      ? ['chefs-secteur']
      : profile.sectorHead
        ? ['collaborateurs']
        : TASKS_TAB_DEFS.map((tab) => tab.path);
  return TASKS_TAB_DEFS.filter((tab) => allowed.includes(tab.path));
}
