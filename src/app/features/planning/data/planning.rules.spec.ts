import { describe, expect, it } from 'vitest';

import { DEMO_ACTIVITIES } from '../../settings/data/settings.demo';
import type { PlanLine } from './planning.models';
import {
  checkAllMessage,
  activityStatusView,
  annualTotal,
  checkFrequency,
  checkMessage,
  frequencyLabel,
  parseDateCell,
  endFor,
  formatPeriod,
  isActivityLocked,
  annualOverview,
  objectives,
  parsePlanRows,
  planStatusView,
  sortLines,
  spanDays,
  summarize,
  validateLine,
  withSubmission,
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
    const target = { ...CO[0]!, frequency: { count: 2, period: 'YEAR' as const, unit: null } };
    expect(
      objectives([target, { ...CO[1]!, frequency: null }], [line(), line({ id: 'b' })]),
    ).toEqual([{ activity: target, planned: 2, target: 2 }]);
  });
});

describe('annualOverview', () => {
  it("multiplie l'objectif « par plantation » par le nombre d'unités du planning", () => {
    const fixed = { ...CO[0]!, frequency: { count: 2, period: 'YEAR' as const, unit: null } };
    const perUnit = {
      ...CO[1]!,
      frequency: { count: 3, period: 'YEAR' as const, unit: 'PLANTATION' as const },
    };
    const none = { ...CO[1]!, id: 'x', frequency: null };
    const rows = annualOverview(
      [fixed, perUnit, none],
      [
        line(),
        line({ id: 'b' }),
        line({ id: 'c', activityId: perUnit.id, place: 'Lot 1' }),
        line({ id: 'd', activityId: perUnit.id, place: 'Lot 2' }),
      ],
    );
    expect(rows.map((r) => [r.activity.id, r.planned, r.target])).toEqual([
      [fixed.id, 2, 2],
      [perUnit.id, 2, 6],
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
        ['02/02/2026', '', 'Formation à la saignée', 'Lot 1', 6],
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

const every = (
  count: number,
  period: 'YEAR' | 'SEMESTER' | 'MONTH',
  unit: 'PLANTATION' | 'SAIGNEUR' | 'MONITEUR' | 'GROUPE' | null = null,
) => ({ count, period, unit });

describe('checkFrequency', () => {
  const session = (date: string, endDate = date) => ({
    date,
    endDate,
    activityId: 'ac-2',
    place: 'Lot 1',
    hours: 4,
  });
  const quarterly = { frequency: every(4, 'YEAR'), durationDays: 1 };

  it('accepte le bon nombre de séances de la bonne durée', () => {
    const check = checkFrequency(quarterly, [
      session('2026-02-02'),
      session('2026-05-04'),
      session('2026-08-03'),
      session('2026-11-02'),
    ]);
    expect(check).toMatchObject({ ok: true, expected: 4, actual: 4, issues: [] });
  });

  it('signale un nombre de séances différent de la fréquence', () => {
    const check = checkFrequency(quarterly, [session('2026-02-02'), session('2026-05-04')]);
    expect(check.ok).toBe(false);
    expect(check.issues[0]).toContain('2 séances programmées pour 4 séances attendues');
    expect(checkFrequency(quarterly, []).issues[0]).toContain("Aucune séance n'est programmée");
  });

  it('signale une durée différente et un chevauchement', () => {
    const check = checkFrequency({ frequency: every(2, 'YEAR'), durationDays: 3 }, [
      session('2026-03-02', '2026-03-04'),
      session('2026-03-04', '2026-03-05'),
    ]);
    expect(check.ok).toBe(false);
    expect(check.issues.some((i) => i.includes('dure 2 jours au lieu de 3 jours'))).toBe(true);
    expect(check.issues.some((i) => i.includes('se chevauchent'))).toBe(true);
  });

  it('sans fréquence définie, ne contrôle que la durée et les chevauchements', () => {
    expect(checkFrequency({ frequency: null, durationDays: 1 }, []).ok).toBe(true);
    expect(frequencyLabel({ frequency: null })).toBe('Non définie');
    expect(frequencyLabel({ frequency: every(12, 'YEAR') })).toBe('12 par an');
  });

  it("formule le message d'information ou d'alerte", () => {
    const activity = {
      label: 'Conférence thématique',
      frequency: every(4, 'YEAR'),
      durationDays: 1,
    };
    const good = checkMessage(activity, { ok: true, expected: 4, actual: 4, issues: [] });
    expect(good.tone).toBe('info');
    expect(good.text).toContain('cohérentes avec la fréquence demandée (4 par an)');
    const bad = checkMessage(activity, checkFrequency(activity, []));
    expect(bad.tone).toBe('warning');
    expect(bad.text).toContain('ne sont pas cohérentes');
    const all = checkAllMessage([
      { activity, check: { ok: true, expected: 4, actual: 4, issues: [] } },
      { activity: { label: 'Voyage' }, check: checkFrequency(activity, []) },
    ]);
    expect(all).toMatchObject({ tone: 'warning' });
    expect(all.text).toContain('1 activité sur 2 comporte des dates non cohérentes : Voyage');
  });

  it('formule la fréquence avec sa période et son unité', () => {
    expect(frequencyLabel({ frequency: every(3, 'YEAR', 'PLANTATION') })).toBe(
      '3 par an et par plantation',
    );
    expect(frequencyLabel({ frequency: every(1, 'MONTH', 'SAIGNEUR') })).toBe(
      '1 par mois et par saigneur',
    );
    expect(frequencyLabel({ frequency: every(1, 'SEMESTER') })).toBe('1 par semestre');
  });

  it('déduit le total annuel quand la fréquence ne dépend pas d’une unité', () => {
    expect(annualTotal(every(1, 'MONTH'))).toBe(12);
    expect(annualTotal(every(1, 'SEMESTER'))).toBe(2);
    expect(annualTotal(every(4, 'YEAR'))).toBe(4);
    expect(annualTotal(every(3, 'YEAR', 'PLANTATION'))).toBeNull();
    expect(annualTotal(null)).toBeNull();
  });

  it('contrôle une séance par mois', () => {
    const monthly = { frequency: every(1, 'MONTH'), durationDays: 1 };
    const all = Array.from({ length: 12 }, (_, i) =>
      session(`2026-${String(i + 1).padStart(2, '0')}-10`),
    );
    expect(checkFrequency(monthly, all)).toMatchObject({ ok: true, expected: 12 });
    const missing = checkFrequency(
      monthly,
      all.filter((_, i) => i !== 3),
    );
    expect(missing.ok).toBe(false);
    expect(missing.issues[0]).toBe('0 séance programmée en avril pour 1 séance attendue.');
    const double = checkFrequency(monthly, [...all, session('2026-06-20')]);
    expect(double.issues[0]).toContain('2 séances programmées en juin pour 1 séance attendue');
  });

  it('contrôle une séance par semestre', () => {
    const semester = { frequency: every(1, 'SEMESTER'), durationDays: 1 };
    expect(checkFrequency(semester, [session('2026-02-02'), session('2026-09-07')]).ok).toBe(true);
    const bad = checkFrequency(semester, [session('2026-02-02'), session('2026-03-09')]);
    expect(bad.issues).toContain('2 séances programmées au 1er semestre pour 1 séance attendue.');
    expect(bad.issues).toContain('0 séance programmée au 2e semestre pour 1 séance attendue.');
  });

  it('contrôle la fréquence pour chaque unité (lot ou section du planning)', () => {
    const perPlantation = { frequency: every(3, 'YEAR', 'PLANTATION'), durationDays: 1 };
    const at = (date: string, place: string) => ({ ...session(date), place });
    const ok = checkFrequency(perPlantation, [
      at('2026-02-02', 'Lot 1'),
      at('2026-06-02', 'Lot 1'),
      at('2026-10-02', 'Lot 1'),
      at('2026-03-02', 'Lot 2'),
      at('2026-07-02', 'Lot 2'),
      at('2026-11-02', 'Lot 2'),
    ]);
    expect(ok).toMatchObject({ ok: true, expected: null, actual: 6 });
    const bad = checkFrequency(perPlantation, [
      at('2026-02-02', 'Lot 1'),
      at('2026-06-02', 'Lot 1'),
      at('2026-10-02', 'Lot 1'),
      at('2026-03-02', 'Lot 2'),
    ]);
    expect(bad.issues).toEqual(['Lot 2 : 1 séance programmée pour 3 séances attendues.']);
  });

  it('autorise deux unités différentes le même jour mais pas la même unité', () => {
    const perGroup = { frequency: every(2, 'YEAR', 'GROUPE'), durationDays: 1 };
    const at = (date: string, place: string) => ({ ...session(date), place });
    const same = checkFrequency(perGroup, [
      at('2026-02-02', 'Groupe 1'),
      at('2026-02-02', 'Groupe 2'),
      at('2026-08-03', 'Groupe 1'),
      at('2026-08-03', 'Groupe 2'),
    ]);
    expect(same.ok).toBe(true);
    const overlap = checkFrequency(perGroup, [
      at('2026-02-02', 'Groupe 1'),
      at('2026-02-02', 'Groupe 1'),
    ]);
    expect(overlap.issues.some((i) => i.includes('se chevauchent'))).toBe(true);
  });
});

describe("soumission d'une activité", () => {
  const draft = { status: 'BROUILLON' as const };

  it("verrouille l'activité soumise ou validée, pas celle rejetée", () => {
    const plan = {
      ...draft,
      submissions: [
        { activityId: 'a', status: 'SOUMIS' as const },
        { activityId: 'b', status: 'VALIDE' as const },
        { activityId: 'c', status: 'REJETE' as const },
      ],
    };
    expect(isActivityLocked(plan, 'a')).toBe(true);
    expect(isActivityLocked(plan, 'b')).toBe(true);
    expect(isActivityLocked(plan, 'c')).toBe(false);
    expect(isActivityLocked(plan, 'd')).toBe(false);
  });

  it('verrouille tout quand le planning est soumis ou validé, ou absent', () => {
    expect(isActivityLocked({ status: 'SOUMIS' }, 'a')).toBe(true);
    expect(isActivityLocked({ status: 'VALIDE' }, 'a')).toBe(true);
    expect(isActivityLocked(null, 'a')).toBe(true);
  });

  it("remplace ou retire l'état d'une activité", () => {
    const plan = { submissions: [{ activityId: 'a', status: 'SOUMIS' as const }] };
    expect(withSubmission(plan, 'a', { activityId: 'a', status: 'VALIDE' })).toEqual([
      { activityId: 'a', status: 'VALIDE' },
    ]);
    expect(withSubmission(plan, 'a', null)).toEqual([]);
    expect(activityStatusView('REJETE').tone).toBe('red');
  });
});
