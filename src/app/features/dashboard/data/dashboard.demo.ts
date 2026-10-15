import type { DashboardData } from './dashboard.models';

/** Données de démonstration : 12 mois complets, d'octobre 2025 à septembre 2026. */
export const DEMO_DASHBOARD: DashboardData = {
  monthly: [
    { month: '2025-10', produced: 1480, target: 1500 },
    { month: '2025-11', produced: 1520, target: 1550 },
    { month: '2025-12', produced: 1690, target: 1650 },
    { month: '2026-01', produced: 1810, target: 1750 },
    { month: '2026-02', produced: 1760, target: 1780 },
    { month: '2026-03', produced: 1620, target: 1700 },
    { month: '2026-04', produced: 1540, target: 1600 },
    { month: '2026-05', produced: 1480, target: 1550 },
    { month: '2026-06', produced: 1590, target: 1600 },
    { month: '2026-07', produced: 1720, target: 1680 },
    { month: '2026-08', produced: 1840, target: 1780 },
    { month: '2026-09', produced: 1910, target: 1850 },
  ],
  planters: [17120, 17260, 17410, 17590, 17700, 17820, 17940, 18060, 18210, 18390, 18580, 18742],
  hectares: [41200, 41450, 41720, 42010, 42260, 42490, 42700, 42980, 43300, 43690, 44080, 44390],
  visitRate: [0.81, 0.79, 0.83, 0.86, 0.84, 0.8, 0.78, 0.77, 0.82, 0.85, 0.88, 0.9],
  visits: { done: 412, planned: 128, postponed: 36 },
  deadlines: [
    {
      id: 'd1',
      title: 'Rapport trimestriel de suivi',
      operator: 'SAPH',
      date: '2026-10-31',
      kind: 'rapport',
    },
    {
      id: 'd2',
      title: "Clôture de l'exercice 2",
      operator: 'SOGB',
      date: '2026-11-15',
      kind: 'contrat',
    },
    {
      id: 'd3',
      title: 'Programme de visites du lot 4',
      operator: 'TRCI',
      date: '2026-10-10',
      kind: 'visite',
    },
    {
      id: 'd4',
      title: 'Renouvellement du contrat triennal',
      operator: 'EXAT',
      date: '2026-12-31',
      kind: 'contrat',
    },
  ],
};
