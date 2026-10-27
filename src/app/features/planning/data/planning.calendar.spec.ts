import { describe, expect, it } from 'vitest';

import { isoOf, linesByDate, longDate, monthCells, monthName } from './planning.calendar';

describe('monthCells', () => {
  it('place le 1er au bon jour de la semaine (lundi en premier)', () => {
    // 1er février 2026 : dimanche -> 6 cases vides ; 28 jours.
    const feb = monthCells(2026, 1);
    expect(feb.slice(0, 7)).toEqual([null, null, null, null, null, null, 1]);
    expect(feb.filter((c) => c !== null)).toHaveLength(28);
    // 1er juin 2026 : lundi -> aucune case vide.
    expect(monthCells(2026, 5)[0]).toBe(1);
  });

  it('gère les années bissextiles', () => {
    expect(monthCells(2028, 1).filter((c) => c !== null)).toHaveLength(29);
  });
});

describe('dates et regroupement', () => {
  it('formate les dates', () => {
    expect(isoOf(2026, 1, 5)).toBe('2026-02-05');
    expect(monthName(2026, 1)).toBe('février');
    expect(longDate('2026-02-05')).toBe('jeudi 5 février 2026');
  });

  it('regroupe les lignes par jour', () => {
    const map = linesByDate([
      {
        id: '1',
        date: '2026-02-05',
        endDate: '2026-02-05',
        activityId: 'a',
        place: 'Lot 1',
      },
      {
        id: '2',
        date: '2026-02-05',
        endDate: '2026-02-05',
        activityId: 'b',
        place: 'Lot 2',
      },
      {
        id: '3',
        date: '2026-02-06',
        endDate: '2026-02-06',
        activityId: 'a',
        place: 'Lot 1',
      },
    ]);
    expect(map.get('2026-02-05')).toHaveLength(2);
    expect(map.get('2026-02-06')).toHaveLength(1);
    expect(map.get('2026-02-07')).toBeUndefined();
  });

  it('étend une période à chacun de ses jours', () => {
    const map = linesByDate([
      {
        id: '1',
        date: '2026-02-27',
        endDate: '2026-03-02',
        activityId: 'a',
        place: 'Lot 1',
      },
    ]);
    expect([...map.keys()]).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
  });
});
