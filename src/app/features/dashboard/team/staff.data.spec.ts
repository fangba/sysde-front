import { describe, expect, it } from 'vitest';

import type { PlanLine } from '../../planning/data/planning.models';
import type { RosterStatus } from '../../planning/data/planning.rules';
import {
  coverageByPoste,
  countByStatus,
  toHandle,
  upcomingTeam,
  type StaffEntry,
} from './staff.data';

const line = (id: string, date: string, endDate = date): PlanLine => ({
  id,
  date,
  endDate,
  activityId: 'a',
  place: 'Lot 1',
  hours: 8,
});

const entry = (
  name: string,
  poste: string,
  status: RosterStatus,
  lines: PlanLine[] = [],
): StaffEntry => ({ userId: name, name, initials: name.slice(0, 2), poste, status, lines });

const team = [
  entry('Akou', 'MO', 'OK', [line('1', '2026-03-10')]),
  entry('Brou', 'MO', 'DRAFT', [line('2', '2026-02-01', '2026-02-20'), line('3', '2026-05-04')]),
  entry('Camara', 'CO', 'REJECTED'),
  entry('Diaby', 'CO', 'NONE'),
  entry('Eba', 'FS', 'SENT'),
];

describe('staff.data', () => {
  it('compte les plannings par état', () => {
    expect(countByStatus(team)).toEqual({ NONE: 1, DRAFT: 1, REJECTED: 1, SENT: 1, OK: 1 });
  });

  it('classe les plannings à traiter : rejetés, puis vides, puis brouillons', () => {
    expect(toHandle(team).map((e) => e.name)).toEqual(['Camara', 'Diaby', 'Brou']);
  });

  it('compte les plannings remis par poste et ignore les postes absents', () => {
    expect(coverageByPoste(team, ['MO', 'CO', 'CF', 'FS'])).toEqual([
      { poste: 'MO', total: 2, sent: 1 },
      { poste: 'CO', total: 2, sent: 0 },
      { poste: 'FS', total: 1, sent: 1 },
    ]);
  });

  it('liste les prochaines activités de l’équipe, en cours comprises', () => {
    const next = upcomingTeam(team, '2026-02-10', 2);
    expect(next.map((n) => n.line.id)).toEqual(['2', '1']);
    expect(next[0]?.who).toBe('Brou');
  });
});
