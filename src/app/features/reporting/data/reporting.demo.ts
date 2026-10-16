import { DEMO_SECTORS } from '../../settings/data/settings.demo';
import type { ReportRow, ReportScope, ReportStatus, ReportView } from './reporting.models';

/** Mois couvert par les rapports de démonstration. */
export const REPORT_PERIOD = 'septembre 2026';

const OPERATOR_ROWS: readonly Omit<ReportRow, 'id' | 'detail'>[] = [
  {
    name: 'SAPH',
    planters: 5200,
    hectares: 12400,
    production: 580,
    visitRate: 0.91,
    status: 'transmis',
  },
  {
    name: 'SOGB',
    planters: 3900,
    hectares: 9800,
    production: 410,
    visitRate: 0.88,
    status: 'transmis',
  },
  {
    name: 'TRCI',
    planters: 2800,
    hectares: 6700,
    production: 290,
    visitRate: 0.84,
    status: 'en-cours',
  },
  {
    name: 'EXAT',
    planters: 2200,
    hectares: 5400,
    production: 230,
    visitRate: 0.79,
    status: 'en-retard',
  },
  {
    name: 'CCP',
    planters: 1700,
    hectares: 4100,
    production: 170,
    visitRate: 0.86,
    status: 'transmis',
  },
  {
    name: 'IDH',
    planters: 1300,
    hectares: 3300,
    production: 130,
    visitRate: 0.82,
    status: 'en-cours',
  },
  {
    name: 'CHC',
    planters: 900,
    hectares: 2200,
    production: 90,
    visitRate: 0.75,
    status: 'en-retard',
  },
];

const SECTOR_SPLIT = [0.45, 0.33, 0.22] as const;
const SECTOR_STATUS: readonly ReportStatus[] = ['transmis', 'en-cours', 'en-retard'];
const TEAM: readonly { name: string; poste: string; share: number }[] = [
  { name: 'Kouassi Yao', poste: 'Conseiller formateur', share: 0.3 },
  { name: 'Traoré Salif', poste: 'Contrôleur', share: 0.28 },
  { name: 'Ouattara Aminata', poste: 'Formateur', share: 0.24 },
  { name: 'Diomandé Eric', poste: 'Moniteur', share: 0.18 },
];
const TEAM_STATUS: readonly ReportStatus[] = ['transmis', 'transmis', 'en-cours', 'en-retard'];

function part(
  id: string,
  name: string,
  detail: string,
  parent: Omit<ReportRow, 'id' | 'detail' | 'name'>,
  share: number,
  rateShift: number,
  status: ReportStatus,
): ReportRow {
  return {
    id,
    name,
    detail,
    planters: Math.round(parent.planters * share),
    hectares: Math.round(parent.hectares * share),
    production: Math.round(parent.production * share),
    visitRate: Math.min(1, Math.max(0, parent.visitRate + rateShift)),
    status,
  };
}

function operatorRow(acronym: string): { row: Omit<ReportRow, 'id' | 'detail'>; index: number } {
  const index = Math.max(
    0,
    OPERATOR_ROWS.findIndex((r) => r.name === acronym),
  );
  return { row: OPERATOR_ROWS[index] as Omit<ReportRow, 'id' | 'detail'>, index };
}

/** Secteurs d'un opérateur : trois secteurs pris dans la liste, décalés selon l'opérateur. */
function sectorsOf(index: number): readonly { code: string; name: string }[] {
  return SECTOR_SPLIT.map((_, i) => DEMO_SECTORS[(index + i) % DEMO_SECTORS.length]).filter(
    (s) => !!s,
  ) as { code: string; name: string }[];
}

/** Rapports du périmètre demandé (équivalent de `GET /reporting` côté back). */
export function buildReport(input: ReportScope): ReportView {
  // Un administrateur qui choisit un opérateur lit le reporting de cet opérateur.
  const scope: ReportScope =
    input.level === 'organisme' && input.filterOperator
      ? { level: 'operateur', operator: input.filterOperator }
      : input;
  if (scope.level === 'organisme') {
    return {
      level: 'organisme',
      rows: OPERATOR_ROWS.map((r) => ({ ...r, id: r.name, detail: 'Opérateur technique' })),
    };
  }
  const { row, index } = operatorRow(scope.operator);
  const sectors = sectorsOf(index);
  if (scope.level === 'operateur' && !scope.filterSector) {
    return {
      level: 'operateur',
      rows: sectors.map((s, i) =>
        part(
          s.code,
          `Secteur ${s.code}`,
          s.name,
          row,
          SECTOR_SPLIT[i] ?? 0,
          -0.02 * i,
          SECTOR_STATUS[i] ?? 'en-cours',
        ),
      ),
    };
  }
  const wanted = scope.level === 'operateur' ? scope.filterSector : scope.sector;
  const sectorPos = Math.max(
    0,
    sectors.findIndex((s) => s.code === wanted),
  );
  const sector = part('s', '', '', row, SECTOR_SPLIT[sectorPos] ?? 0.3, 0, 'transmis');
  return {
    level: 'secteur',
    rows: TEAM.map((m, i) =>
      part(`c${i}`, m.name, m.poste, sector, m.share, -0.015 * i, TEAM_STATUS[i] ?? 'en-cours'),
    ),
  };
}

/** Secteurs d'un opérateur avec leur part de ses volumes (démo, partagés avec le dashboard). */
export function demoSectorsOfOperator(
  acronym: string,
): readonly { code: string; name: string; share: number }[] {
  return sectorsOf(operatorRow(acronym).index).map((s, i) => ({
    ...s,
    share: SECTOR_SPLIT[i] ?? 0,
  }));
}

/** Opérateurs techniques dont l'administrateur peut consulter le reporting. */
export const DEMO_REPORT_OPERATORS: readonly string[] = OPERATOR_ROWS.map((r) => r.name);
