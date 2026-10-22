import type { AnnualPlan, PlanLine } from './planning.models';

const YEAR = new Date().getFullYear();

const iso = (month: number, day: number): string =>
  new Date(Date.UTC(YEAR, month - 1, day)).toISOString().slice(0, 10);

const line = (
  n: number,
  month: number,
  day: number,
  activityId: string,
  place: string,
  hours: number,
  days = 1,
): PlanLine => ({
  id: `ligne-demo-${n}`,
  date: iso(month, day),
  endDate: iso(month, day + days - 1),
  activityId,
  place,
  hours,
});

/**
 * Plannings de démonstration du secteur S01 (opérateur SAPH) : un planning soumis, un rejeté
 * et le planning validé du chef secteur.
 */
export const DEMO_PLANS: readonly AnnualPlan[] = [
  {
    id: 'plan-demo-fs',
    userId: 'us-14',
    year: YEAR,
    status: 'SOUMIS',
    lines: [
      line(1, 2, 3, 'ac-9', 'Lot 1', 6, 20),
      line(2, 2, 10, 'ac-9', 'Lot 2', 6),
      line(3, 3, 4, 'ac-9', 'Lot 1', 5),
      line(4, 3, 18, 'ac-9', 'Lot 3', 4),
      line(5, 4, 7, 'ac-9', 'Lot 2', 3),
      line(6, 5, 12, 'ac-9', 'Lot 3', 6),
    ],
  },
  {
    id: 'plan-demo-co',
    userId: 'us-24',
    year: YEAR,
    status: 'SOUMIS',
    lines: [
      line(11, 2, 5, 'ac-7', 'Section A', 5),
      line(12, 2, 12, 'ac-8', 'Section B', 5),
      line(13, 3, 6, 'ac-7', 'Section A', 4),
      line(14, 3, 20, 'ac-8', 'Section C', 2),
    ],
  },
  {
    id: 'plan-demo-cf',
    userId: 'us-23',
    year: YEAR,
    status: 'BROUILLON',
    lines: [line(21, 2, 9, 'ac-4', 'Lot 1', 7, 20), line(22, 2, 16, 'ac-5', 'Lot 2', 5)],
    rejection: {
      reason: 'Prévoir la formation de février avant les contrôles de saignée.',
      date: `${YEAR}-01-20`,
    },
  },
  {
    id: 'plan-demo-mo',
    userId: 'us-25',
    year: YEAR,
    status: 'BROUILLON',
    lines: [
      line(41, 1, 12, 'ac-11', 'Section A', 6),
      line(42, 1, 19, 'ac-11', 'Section B', 6),
      line(43, 2, 9, 'ac-10', 'Section A', 5),
      line(44, 3, 10, 'ac-13', 'Groupe 1', 4),
      line(45, 4, 14, 'ac-11', 'Section A', 6),
      line(46, 6, 15, 'ac-13', 'Groupe 1', 4),
      line(47, 10, 28, 'ac-11', 'Section B', 6),
      line(48, 11, 17, 'ac-13', 'Groupe 2', 4),
    ],
  },
  {
    id: 'plan-demo-es',
    userId: 'us-26',
    year: YEAR,
    status: 'VALIDE',
    lines: [
      line(51, 3, 5, 'ac-14', 'Lot 2', 6),
      line(52, 9, 8, 'ac-14', 'Lot 2', 6),
      line(53, 12, 3, 'ac-14', 'Lot 1', 6),
    ],
  },
  {
    id: 'plan-demo-cs',
    userId: 'us-21',
    year: YEAR,
    status: 'VALIDE',
    lines: [line(31, 2, 2, 'ac-2', 'Lot 1', 3), line(32, 3, 2, 'ac-1', 'Lot 2', 6)],
  },
];
