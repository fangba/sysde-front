import { describe, expect, it } from 'vitest';

import { tasksTabsFor } from './tasks.access';

const paths = (administrator: boolean, departmentHead: boolean, sectorHead = false) =>
  tasksTabsFor({ administrator, departmentHead, sectorHead }).map((t) => t.path);

describe('tasksTabsFor', () => {
  it('donne aux administrateurs Utilisateur et Chef département', () => {
    expect(paths(true, false)).toEqual(['utilisateurs', 'chefs-departement']);
  });

  it('donne au chef de département le seul onglet Chef secteur', () => {
    expect(paths(false, true)).toEqual(['chefs-secteur']);
  });

  it('donne au chef secteur le seul onglet Collaborateurs', () => {
    expect(paths(false, false, true)).toEqual(['collaborateurs']);
  });

  it('laisse tous les onglets aux autres comptes', () => {
    expect(paths(false, false)).toHaveLength(4);
  });
});
