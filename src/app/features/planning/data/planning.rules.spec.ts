import { describe, expect, it } from 'vitest';

import { DEMO_ACTIVITIES } from '../../settings/data/settings.demo';
import type { PlanLine } from './planning.models';
import {
  parseDateCell,
  endFor,
  formatPeriod,
  objectives,
  parsePlanRows,
  planStatusView,
  sortLines,
  spanDays,
  summarize,
  validateLine,
} from './planning.rules';

// Activités du poste CO : ac-7 « Visite de plantation » et ac-8 « Visite de conformité ».
const CO = DEMO_ACTIVITIES.filter((a) => a.poste === 'CO');
const allowed = new Set(CO.map((a) => a.id));

const line = (over: Partial<PlanLine> = {}): PlanLine => ({
  id: 'a',
  date: '2026-03-10',
  endDate: '2026-03-10',
  activityId: 'ac-7',
  place: 'Lot 1',
  hours: 4,
  ...over,
});

describe('validateLine', () => {
  it('accepte une ligne correcte', () => {
    expect(validateLine(line(), 2026, [])).toBeNull();
  });

  it("refuse une date hors de l'année du planning ou inexistante", () => {
    expect(validateLine(line({ date: '2027-01-02' }), 2026, [])).toContain('2026');
    expect(validateLine(line({ date: '2026-02-30' }), 2026, [])).toContain('pas valide');
  });

  it("refuse une période incohérente ou qui sort de l'année", () => {
    expect(validateLine(line({ endDate: '2026-03-09' }), 2026, [])).toContain('précéder');
    expect(validateLine(line({ endDate: '2027-01-01' }), 2026, [])).toContain('2026');
    expect(validateLine(line({ endDate: '2026-03-29' }), 2026, [])).toBeNull();
  });

  it('refuse une activité inconnue, un lieu vide ou une durée hors limites', () => {
    expect(validateLine(line({ activityId: '' }), 2026, [])).toContain('pas proposée');
    expect(validateLine(line({ place: '  ' }), 2026, [])).toContain('obligatoire');
    expect(validateLine(line({ hours: 0 }), 2026, [])).toContain('heures');
    expect(validateLine(line({ hours: 13 }), 2026, [])).toContain('heures');
  });

  it("refuse une activité qui n'est pas celle du poste", () => {
    expect(validateLine(line({ activityId: 'ac-4' }), 2026, [], undefined, allowed)).toContain(
      'pas proposée',
    );
    expect(validateLine(line({ activityId: 'ac-8' }), 2026, [], undefined, allowed)).toBeNull();
  });

  it('refuse un doublon (même jour, activité et lieu) mais pas la ligne elle-même', () => {
    const other = line({ id: 'b', place: 'LOT 1' });
    expect(validateLine(line(), 2026, [other])).toContain('déjà prévue');
    expect(validateLine(line({ id: 'b' }), 2026, [other], 'b')).toBeNull();
  });
});

describe('sortLines et summarize', () => {
  it('trie par date puis calcule le résumé', () => {
    const lines = [
      line({ id: '1', date: '2026-05-01', endDate: '2026-05-01' }),
      line({ id: '2', hours: 2.5 }),
    ];
    expect(sortLines(lines).map((l) => l.id)).toEqual(['2', '1']);
    expect(summarize(lines)).toEqual({ count: 2, hours: 6.5, days: 2 });
  });

  it("compte chaque jour d'une période, sans doublon", () => {
    const lines = [
      line({ id: '1', date: '2026-03-10', endDate: '2026-03-12', hours: 6 }),
      line({ id: '2', date: '2026-03-12', endDate: '2026-03-12', hours: 2 }),
    ];
    expect(summarize(lines)).toEqual({ count: 2, hours: 20, days: 3 });
    expect(spanDays(lines[0]!)).toBe(3);
    expect(formatPeriod(lines[0]!)).toBe('10/03/2026 → 12/03/2026');
  });

  it("suit l'objectif annuel des activités", () => {
    const target = { ...CO[0]!, annualTarget: 2 };
    expect(objectives([target, CO[1]!], [line(), line({ id: 'b' })])).toEqual([
      { activity: target, planned: 2, target: 2 },
    ]);
  });
});

describe('planStatusView', () => {
  it('distingue brouillon, rejeté, à valider et validé', () => {
    expect(planStatusView({ status: 'BROUILLON' }).label).toBe('Brouillon');
    expect(
      planStatusView({ status: 'BROUILLON', rejection: { reason: 'x', date: '2026-01-01' } }).label,
    ).toBe('Rejeté');
    expect(planStatusView({ status: 'SOUMIS' }).label).toBe('À valider');
    expect(planStatusView({ status: 'VALIDE' }).label).toBe('Validé');
  });
});

describe('parseDateCell', () => {
  it('lit une date Excel, jj/mm/aaaa et aaaa-mm-jj', () => {
    expect(parseDateCell(new Date('2026-02-05T00:00:00.000Z'))).toBe('2026-02-05');
    expect(parseDateCell('5/2/2026')).toBe('2026-02-05');
    expect(parseDateCell('2026-02-05')).toBe('2026-02-05');
    expect(parseDateCell('31/02/2026')).toBeNull();
    expect(parseDateCell(46058)).toBeNull();
  });
});

describe('parsePlanRows', () => {
  const header = ['Date', 'Activité', 'Lot / section', 'Heures par jour'];

  it('importe des lignes valides, colonnes dans le désordre et accents ignorés', () => {
    const result = parsePlanRows(
      [
        [],
        ['Heures par jour', 'DATE', 'activite', 'Lot'],
        ['2,5', new Date('2026-02-05T00:00:00.000Z'), 'visite de plantation', 'Lot 2'],
        [null, null, null, null],
        [6, '06/02/2026', 'Visite de conformité', 'Section A'],
      ],
      2026,
      CO,
    );
    expect(result.errors).toEqual([]);
    expect(result.lines).toEqual([
      { date: '2026-02-05', endDate: '2026-02-05', activityId: 'ac-7', place: 'Lot 2', hours: 2.5 },
      {
        date: '2026-02-06',
        endDate: '2026-02-06',
        activityId: 'ac-8',
        place: 'Section A',
        hours: 6,
      },
    ]);
  });

  it("lit la date de fin, ou la déduit de la durée de l'activité", () => {
    const cf = DEMO_ACTIVITIES.filter((a) => a.poste === 'CF');
    const result = parsePlanRows(
      [
        ['Date début', 'Date fin', 'Activité', 'Lot / section', 'Heures par jour'],
        ['02/02/2026', '', 'Formation initiale', 'Lot 1', 6],
        ['02/06/2026', '04/06/2026', 'Recyclage des saigneurs', 'Lot 1', 6],
      ],
      2026,
      cf,
    );
    expect(result.errors).toEqual([]);
    expect(result.lines.map((l) => l.endDate)).toEqual(['2026-02-21', '2026-06-04']);
    expect(endFor('2026-02-02', 20)).toBe('2026-02-21');
  });

  it('signale la ligne et la raison de chaque erreur', () => {
    const result = parsePlanRows(
      [
        header,
        ['2026-02-05', 'Formation initiale', 'Lot 1', 4],
        ['pas une date', 'Visite de conformité', 'Lot 1', 4],
        ['2026-02-05', 'Visite de conformité', 'Lot 1', 'beaucoup'],
        ['2026-02-05', 'Visite de conformité', 'Lot 1', 4],
        ['2026-02-05', 'Visite de conformité', 'Lot 1', 4],
        ['2027-01-05', 'Visite de conformité', 'Lot 1', 4],
      ],
      2026,
      CO,
    );
    expect(result.errors.map((e) => e.row)).toEqual([2, 3, 4, 6, 7]);
    expect(result.errors[0]!.message).toContain('Valeurs admises : Visite de plantation');
    expect(result.errors[3]!.message).toContain('déjà prévue');
  });

  it('refuse un fichier vide ou sans la colonne attendue', () => {
    expect(parsePlanRows([], 2026, CO).errors[0]!.message).toContain('vide');
    expect(parsePlanRows([['Date', 'Activité']], 2026, CO).errors[0]!.message).toContain(
      'Colonne manquante',
    );
    expect(parsePlanRows([header], 2026, CO).errors[0]!.message).toContain('aucune ligne');
  });
});
