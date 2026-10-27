import { describe, expect, it } from 'vitest';

import type { PlanLine } from '../../planning/data/planning.models';
import {
  daysPerCategory,
  daysPerMonth,
  daysUntil,
  inMonth,
  isFieldPoste,
  objectiveRate,
  upcoming,
} from './field.data';

const line = (id: string, date: string, endDate: string, activityId = 'a'): PlanLine => ({
  id,
  date,
  endDate,
  activityId,
  place: 'Lot 1',
});

describe('dashboard de terrain', () => {
  const lines = [line('1', '2026-02-27', '2026-03-02'), line('2', '2026-05-10', '2026-05-10', 'b')];

  it('répartit les jours sur les mois', () => {
    const months = daysPerMonth(lines, 2026);
    expect(months[1]).toBe(2);
    expect(months[2]).toBe(2);
    expect(months[4]).toBe(1);
    expect(months.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it('totalise les jours par catégorie', () => {
    const totals = daysPerCategory(lines, (id) => (id === 'a' ? 'FORMATION' : 'VISITE'));
    expect(totals).toEqual({ FORMATION: 4, VISITE: 1, RENCONTRE: 0 });
  });

  it("liste les activités en cours ou à venir, dans l'ordre", () => {
    expect(upcoming(lines, '2026-03-01', 5).map((l) => l.id)).toEqual(['1', '2']);
    expect(upcoming(lines, '2026-03-03', 5).map((l) => l.id)).toEqual(['2']);
    expect(upcoming(lines, '2026-01-01', 1).map((l) => l.id)).toEqual(['1']);
  });

  it("compte les jours avant le début, 0 si l'activité est commencée", () => {
    expect(daysUntil(lines[1]!, '2026-05-08')).toBe(2);
    expect(daysUntil(lines[0]!, '2026-03-01')).toBe(0);
  });

  it('retient les activités qui touchent le mois', () => {
    expect(inMonth(lines, 2026, 3).map((l) => l.id)).toEqual(['1']);
    expect(inMonth(lines, 2026, 2).map((l) => l.id)).toEqual(['1']);
    expect(inMonth(lines, 2026, 5).map((l) => l.id)).toEqual(['2']);
    expect(inMonth(lines, 2026, 12)).toEqual([]);
  });

  it('calcule la couverture des objectifs, plafonnée à 100 % par activité', () => {
    expect(objectiveRate([])).toBeNull();
    expect(
      objectiveRate([
        { planned: 3, target: 2 },
        { planned: 0, target: 2 },
      ]),
    ).toBe(0.5);
  });

  it('reconnaît les postes de terrain', () => {
    expect(isFieldPoste('MO')).toBe(true);
    expect(isFieldPoste('SE')).toBe(false);
    expect(isFieldPoste(undefined)).toBe(false);
  });
});
