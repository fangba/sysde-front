import type { ReportRow, ReportStatus } from './reporting.models';

export interface ReportTotals {
  readonly planters: number;
  readonly hectares: number;
  readonly production: number;
  /** Taux de visites moyen, pondéré par le nombre de planteurs. */
  readonly visitRate: number;
  readonly byStatus: Readonly<Record<ReportStatus, number>>;
}

export function totalsOf(rows: readonly ReportRow[]): ReportTotals {
  const planters = rows.reduce((sum, r) => sum + r.planters, 0);
  const byStatus: Record<ReportStatus, number> = { transmis: 0, 'en-cours': 0, 'en-retard': 0 };
  for (const row of rows) {
    byStatus[row.status] += 1;
  }
  return {
    planters,
    hectares: rows.reduce((sum, r) => sum + r.hectares, 0),
    production: rows.reduce((sum, r) => sum + r.production, 0),
    visitRate:
      planters === 0 ? 0 : rows.reduce((sum, r) => sum + r.visitRate * r.planters, 0) / planters,
    byStatus,
  };
}

/** Contenu CSV (séparateur « ; », lisible directement par Excel en français). */
export function toCsv(header: readonly string[], lines: readonly (readonly string[])[]): string {
  const cell = (v: string): string => `"${v.replaceAll('"', '""')}"`;
  return [header, ...lines].map((l) => l.map(cell).join(';')).join('\r\n');
}
