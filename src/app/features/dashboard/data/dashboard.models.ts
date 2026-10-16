/** Fenêtre d'affichage du graphique de production. */
export type PeriodId = '3m' | '6m' | '12m';

export interface PeriodOption {
  readonly value: PeriodId;
  readonly label: string;
  readonly months: number;
}

export const PERIOD_OPTIONS: readonly PeriodOption[] = [
  { value: '3m', label: '3 derniers mois', months: 3 },
  { value: '6m', label: '6 derniers mois', months: 6 },
  { value: '12m', label: '12 derniers mois', months: 12 },
];

export const DEFAULT_PERIOD: PeriodId = '12m';

/** Production mensuelle de caoutchouc sec (en tonnes) et objectif du mois. */
export interface MonthlyProduction {
  /** Mois au format aaaa-mm. */
  readonly month: string;
  readonly produced: number;
  readonly target: number;
}

export type DeadlineKind = 'contrat' | 'rapport' | 'visite';

export interface Deadline {
  readonly id: string;
  readonly title: string;
  readonly operator: string;
  /** Date ISO (aaaa-mm-jj). */
  readonly date: string;
  readonly kind: DeadlineKind;
  /** Code du secteur concerné, le cas échéant. */
  readonly sector?: string;
}

export interface VisitBreakdown {
  readonly done: number;
  readonly planned: number;
  readonly postponed: number;
}

/** Données brutes renvoyées par `GET /dashboard`. */
export interface DashboardData {
  readonly monthly: readonly MonthlyProduction[];
  /** Planteurs actifs, fin de chaque mois (même longueur que `monthly`). */
  readonly planters: readonly number[];
  /** Superficie encadrée en hectares, fin de chaque mois. */
  readonly hectares: readonly number[];
  /** Taux de visites réalisées par rapport au programme, de 0 à 1, pour chaque mois. */
  readonly visitRate: readonly number[];
  /** Visites du mois en cours. */
  readonly visits: VisitBreakdown;
  readonly deadlines: readonly Deadline[];
}
