import { describe, expect, it } from 'vitest';

import { planningTabsFor } from './planning.access';

describe('planningTabsFor', () => {
  it("donne l'onglet Validation au seul chef secteur", () => {
    expect(planningTabsFor({ sectorHead: true }).map((t) => t.path)).toEqual([
      'elaboration',
      'validation',
    ]);
    expect(planningTabsFor({ sectorHead: false }).map((t) => t.path)).toEqual(['elaboration']);
  });

  it("ne donne que l'onglet Équipe à la secrétaire", () => {
    expect(planningTabsFor({ sectorHead: false, secretary: true }).map((t) => t.path)).toEqual([
      'equipe',
    ]);
  });
});
