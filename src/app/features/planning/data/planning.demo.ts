import type { AnnualPlan, PlanLine } from './planning.models';

const YEAR = new Date().getFullYear();

const iso = (month: number, day: number): string =>
  new Date(Date.UTC(YEAR, month - 1, day)).toISOString().slice(0, 10);

/** Activités de catégorie Visite du référentiel de démonstration. */
const VISIT_IDS: ReadonlySet<string> = new Set(['ac-1', 'ac-7', 'ac-8', 'ac-11', 'ac-14']);

const DEMO_PLANTATIONS = ['Plantation 03', 'Plantation 07', 'Plantation 12', 'Plantation 18'];

/** Plantation de démonstration déterminée par le lot ou la section. */
function plantationOf(place: string): string {
  let hash = 0;
  for (const char of place) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997;
  }
  return DEMO_PLANTATIONS[hash % DEMO_PLANTATIONS.length]!;
}

const line = (
  n: number,
  month: number,
  day: number,
  activityId: string,
  place: string,
  days = 1,
): PlanLine => ({
  id: `ligne-demo-${n}`,
  date: iso(month, day),
  endDate: iso(month, day + days - 1),
  activityId,
  place,
  ...(VISIT_IDS.has(activityId) ? { plantation: plantationOf(place) } : {}),
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
    status: 'BROUILLON',
    lines: [
      line(1, 2, 3, 'ac-9', 'Lot 1', 20),
      line(2, 2, 10, 'ac-9', 'Lot 2'),
      line(3, 3, 4, 'ac-9', 'Lot 1'),
      line(4, 3, 18, 'ac-9', 'Lot 3'),
      line(5, 4, 7, 'ac-9', 'Lot 2'),
      line(6, 5, 12, 'ac-9', 'Lot 3'),
    ],
  },
  {
    id: 'plan-demo-co',
    userId: 'us-24',
    year: YEAR,
    status: 'BROUILLON',
    lines: [
      line(11, 2, 5, 'ac-7', 'Section A'),
      line(13, 6, 6, 'ac-7', 'Section A'),
      line(14, 10, 8, 'ac-7', 'Section A'),
      ...Array.from({ length: 12 }, (_, m) => line(30 + m, m + 1, 12, 'ac-8', 'Section B')),
    ],
  },
  {
    id: 'plan-demo-cf',
    userId: 'us-23',
    year: YEAR,
    status: 'BROUILLON',
    lines: [line(21, 2, 9, 'ac-4', 'Lot 1', 20), line(22, 2, 16, 'ac-5', 'Lot 2')],
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
      line(41, 1, 12, 'ac-11', 'Section A'),
      line(42, 1, 19, 'ac-11', 'Section B'),
      line(43, 2, 9, 'ac-10', 'Section A'),
      line(44, 3, 10, 'ac-13', 'Groupe 1'),
      line(45, 4, 14, 'ac-11', 'Section A'),
      line(46, 6, 15, 'ac-13', 'Groupe 1'),
      line(47, 10, 28, 'ac-11', 'Section B'),
      line(48, 11, 17, 'ac-13', 'Groupe 2'),
      line(49, 7, 7, 'ac-11', 'Section A'),
      line(50, 10, 6, 'ac-11', 'Section A'),
      line(54, 4, 21, 'ac-11', 'Section B'),
      line(55, 7, 14, 'ac-11', 'Section B'),
    ],
    // Visite de plantation : 4 visites par section, soumise seule au chef secteur.
    submissions: [{ activityId: 'ac-11', status: 'SOUMIS' }],
  },
  {
    id: 'plan-demo-es',
    userId: 'us-26',
    year: YEAR,
    status: 'BROUILLON',
    lines: [
      line(51, 3, 5, 'ac-14', 'Lot 2'),
      line(52, 9, 8, 'ac-14', 'Lot 2'),
      line(53, 12, 3, 'ac-14', 'Lot 1'),
    ],
  },
  {
    id: 'plan-demo-cs',
    userId: 'us-21',
    year: YEAR,
    status: 'BROUILLON',
    // Conférence thématique : 4 séances (cohérent) ; Voyage d'étude : 3 sur 4 (à compléter).
    lines: [
      line(31, 2, 2, 'ac-2', 'Lot 1'),
      line(32, 3, 2, 'ac-1', 'Lot 2'),
      line(33, 5, 4, 'ac-2', 'Lot 2'),
      line(34, 8, 3, 'ac-2', 'Lot 1'),
      line(35, 11, 2, 'ac-2', 'Lot 2'),
      line(36, 4, 6, 'ac-3', 'Lot 1'),
      line(37, 7, 6, 'ac-3', 'Lot 2'),
      line(38, 10, 5, 'ac-3', 'Lot 1'),
      line(39, 6, 9, 'ac-1', 'Lot 1'),
      line(40, 9, 15, 'ac-1', 'Lot 2'),
      line(41, 2, 10, 'ac-1', 'Lot 1'),
      line(42, 10, 20, 'ac-1', 'Lot 1'),
      line(43, 6, 22, 'ac-1', 'Lot 2'),
    ],
  },
];
