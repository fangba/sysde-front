import { DEMO_DASHBOARD } from './dashboard.demo';
import { profileFor } from './dashboard.profile';
import { scopeDashboard } from './dashboard.scope';

describe('scopeDashboard', () => {
  it('garde tout pour un administrateur', () => {
    const data = scopeDashboard(DEMO_DASHBOARD, { profile: 'organisme', operator: 'FIRCA' });
    expect(data.deadlines).toHaveLength(DEMO_DASHBOARD.deadlines.length);
    expect(data.visits.done).toBe(DEMO_DASHBOARD.visits.done);
  });

  it('limite le chef de département aux échéances de son opérateur', () => {
    const data = scopeDashboard(DEMO_DASHBOARD, { profile: 'operateur', operator: 'SAPH' });
    expect(data.deadlines.every((d) => d.operator === 'SAPH')).toBe(true);
    expect(data.planters.at(-1)).toBeLessThan(DEMO_DASHBOARD.planters.at(-1) ?? 0);
  });

  it('limite le chef de secteur à son secteur', () => {
    const data = scopeDashboard(DEMO_DASHBOARD, {
      profile: 'secteur',
      operator: 'SAPH',
      sector: 'S02',
    });
    expect(data.deadlines.some((d) => d.sector === 'S01')).toBe(false);
  });
});

describe('filtre par opérateur', () => {
  it("restreint l'administrateur à l'opérateur choisi", () => {
    const data = scopeDashboard(DEMO_DASHBOARD, {
      profile: 'organisme',
      operator: 'FIRCA',
      filterOperator: 'SOGB',
    });
    expect(data.deadlines.every((d) => d.operator === 'SOGB')).toBe(true);
    expect(data.planters.at(-1)).toBeLessThan(DEMO_DASHBOARD.planters.at(-1) ?? 0);
  });
});

describe('profileFor', () => {
  it('choisit le profil selon le rôle', () => {
    const f = { administrator: false, departmentHead: false, sectorHead: false };
    expect(profileFor({ ...f, administrator: true })).toBe('organisme');
    expect(profileFor({ ...f, departmentHead: true })).toBe('operateur');
    expect(profileFor({ ...f, sectorHead: true })).toBe('secteur');
    expect(profileFor(f)).toBe('supervision');
  });
});

describe('filtre par secteur', () => {
  it('liste les secteurs du chef de département et réduit les volumes', () => {
    const all = scopeDashboard(DEMO_DASHBOARD, { profile: 'operateur', operator: 'SAPH' });
    expect(all.sectors).toHaveLength(3);
    const one = scopeDashboard(DEMO_DASHBOARD, {
      profile: 'operateur',
      operator: 'SAPH',
      filterSector: 'S01',
    });
    expect(one.planters.at(-1)).toBeLessThan(all.planters.at(-1) ?? 0);
    expect(one.deadlines.every((d) => !d.sector || d.sector === 'S01')).toBe(true);
  });
});
