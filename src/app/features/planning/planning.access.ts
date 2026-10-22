/** Onglets du menu Planning. */
export interface PlanningTabDef {
  readonly path: string;
  readonly label: string;
}

export const PLANNING_TAB_DEFS: readonly PlanningTabDef[] = [
  { path: 'elaborer', label: 'Élaborer' },
  { path: 'valider', label: 'Valider' },
  { path: 'equipe', label: 'Équipe' },
];

/**
 * Élaborer pour les postes qui planifient ; Valider en plus pour le chef secteur ;
 * la secrétaire n'a que Équipe (consultation des plannings du secteur).
 */
export function planningTabsFor(profile: {
  readonly sectorHead: boolean;
  readonly secretary?: boolean;
}): readonly PlanningTabDef[] {
  return PLANNING_TAB_DEFS.filter((tab) =>
    profile.secretary
      ? tab.path === 'equipe'
      : tab.path === 'elaborer' || (profile.sectorHead && tab.path === 'valider'),
  );
}
