import { describe, expect, it } from 'vitest';

import { planningTabsFor } from './planning.access';

describe('planningTabsFor', () => {
  it("donne l'onglet Valider au seul chef secteur", () => {
    expect(planningTabsFor({ sectorHead: true }).map((t) => t.path)).toEqual([
      'elaborer',
      'valider',
    ]);
    expect(planningTabsFor({ sectorHead: false }).map((t) => t.path)).toEqual(['elaborer']);
  });

  it("ne donne que l'onglet Équipe à la secrétaire", () => {
    expect(planningTabsFor({ sectorHead: false, secretary: true }).map((t) => t.path)).toEqual([
      'equipe',
    ]);
  });
});
