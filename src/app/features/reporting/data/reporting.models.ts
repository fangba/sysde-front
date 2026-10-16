import type { Tone } from '@shared/models/tone';

/** Niveau de lecture du reporting, selon le profil de l'utilisateur. */
export type ReportLevel = 'organisme' | 'operateur' | 'secteur';

export type ReportStatus = 'transmis' | 'en-cours' | 'en-retard';

export const REPORT_STATUS_LABEL: Readonly<Record<ReportStatus, string>> = {
  transmis: 'Transmis',
  'en-cours': 'En cours',
  'en-retard': 'En retard',
};

export const REPORT_STATUS_TONE: Readonly<Record<ReportStatus, Tone>> = {
  transmis: 'green',
  'en-cours': 'amber',
  'en-retard': 'red',
};

/** Une ligne du reporting : un opérateur, un secteur ou un collaborateur selon le niveau. */
export interface ReportRow {
  readonly id: string;
  readonly name: string;
  readonly detail: string;
  readonly planters: number;
  readonly hectares: number;
  /** Production de caoutchouc sec, en tonnes. */
  readonly production: number;
  /** Taux de visites réalisées, de 0 à 1. */
  readonly visitRate: number;
  readonly status: ReportStatus;
}

export interface ReportScope {
  readonly level: ReportLevel;
  readonly operator: string;
  readonly sector?: string;
}

export interface ReportView {
  readonly level: ReportLevel;
  readonly rows: readonly ReportRow[];
}
