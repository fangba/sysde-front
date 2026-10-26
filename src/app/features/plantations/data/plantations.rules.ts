import type { Plantation } from './plantations.models';

export interface PlantationFilter {
  readonly operator: string;
  readonly sector: string;
}

export const ALL = 'ALL';

export function applyFilter(
  rows: readonly Plantation[],
  filter: PlantationFilter,
): readonly Plantation[] {
  return rows.filter(
    (p) =>
      (filter.operator === ALL || p.operator === filter.operator) &&
      (filter.sector === ALL || `${p.operator}/${p.sectorCode}` === filter.sector),
  );
}

export interface PlantationTotals {
  readonly count: number;
  readonly planters: number;
  readonly hectares: number;
  /** Part des plantations géolocalisées, entre 0 et 1. */
  readonly geolocatedRate: number;
}

export function totalsOf(rows: readonly Plantation[]): PlantationTotals {
  const geolocated = rows.filter((p) => p.geolocated).length;
  return {
    count: rows.length,
    planters: new Set(rows.map((p) => p.planter.name)).size,
    hectares: rows.reduce((sum, p) => sum + p.hectares, 0),
    geolocatedRate: rows.length ? geolocated / rows.length : 0,
  };
}

// ───────────────────────── Affectation des plantations aux sections ─────────────────────────

/** Section, lot et secteur de SysDE, réduits à ce que l'affectation utilise. */
export interface SectionRef {
  readonly id: string;
  readonly lotId: string;
  readonly name: string;
}
export interface LotRef {
  readonly id: string;
  readonly sectorId: string;
  readonly number: number;
}
export interface SectorRef {
  readonly id: string;
  readonly code: string;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Sections où une plantation peut être affectée : celles du lot (même numéro, même secteur) où
 * elle se trouve.
 */
export function sectionsFor(
  plantation: Pick<Plantation, 'sectorCode' | 'lot'>,
  sections: readonly SectionRef[],
  lots: readonly LotRef[],
  sectors: readonly SectorRef[],
): readonly SectionRef[] {
  const sector = sectors.find((s) => s.code === plantation.sectorCode);
  if (!sector) {
    return [];
  }
  const lotIds = new Set(
    lots.filter((l) => l.sectorId === sector.id && l.number === plantation.lot).map((l) => l.id),
  );
  return sections
    .filter((s) => lotIds.has(s.lotId))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export interface AssignmentItem {
  readonly plantation: Plantation;
  readonly section: SectionRef;
}
export interface AssignmentError {
  /** Numéro de ligne dans le fichier (l'en-tête est la ligne 1). */
  readonly row: number;
  readonly message: string;
}
export interface AssignmentImport {
  /** À enregistrer : la plantation change de section. */
  readonly ready: readonly AssignmentItem[];
  readonly errors: readonly AssignmentError[];
  /** Lignes déjà conformes (même section) ou sans section indiquée. */
  readonly unchanged: number;
  /** Fichier inutilisable (colonnes absentes, vide) ; les autres champs sont alors vides. */
  readonly fileError?: string;
}

const PLANTATION_HEADERS = [
  'plantation',
  'code',
  'code plantation',
  'n plantation',
  'plantation (code)',
];
const SECTION_HEADERS = [
  'section',
  'nom de la section',
  'section a affecter',
  'section (a remplir)',
];

/** Texte d'une cellule Excel, sans espaces superflus. */
function cellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * Lit un fichier d'affectations : colonnes « Plantation » (code) et « Section » (nom). Chaque
 * plantation doit être connue de SysDE et chaque section exister dans le lot de la plantation ;
 * une ligne en erreur n'empêche pas d'enregistrer les autres.
 */
export function parseAssignmentRows(
  rows: readonly (readonly unknown[])[],
  plantations: readonly Plantation[],
  sections: readonly SectionRef[],
  lots: readonly LotRef[],
  sectors: readonly SectorRef[],
): AssignmentImport {
  const empty = { ready: [], errors: [], unchanged: 0 } as const;
  const [header, ...body] = rows;
  if (!header || body.every((r) => r.every((c) => cellText(c) === ''))) {
    return { ...empty, fileError: 'Le fichier ne contient aucune ligne à importer.' };
  }
  const names = header.map((h) => normalize(cellText(h)));
  const plantationCol = names.findIndex((n) => PLANTATION_HEADERS.includes(n));
  const sectionCol = names.findIndex((n) => SECTION_HEADERS.includes(n));
  if (plantationCol < 0 || sectionCol < 0) {
    return {
      ...empty,
      fileError:
        'Les colonnes « Plantation » et « Section » sont introuvables sur la première ligne.',
    };
  }

  const byCode = new Map(plantations.map((p) => [normalize(p.code), p]));
  const seen = new Set<string>();
  const ready: AssignmentItem[] = [];
  const errors: AssignmentError[] = [];
  let unchanged = 0;

  body.forEach((cells, index) => {
    const row = index + 2;
    const code = cellText(cells[plantationCol]);
    const name = cellText(cells[sectionCol]);
    if (code === '' && name === '') {
      return;
    }
    if (code === '') {
      errors.push({ row, message: 'La plantation n’est pas indiquée.' });
      return;
    }
    const plantation = byCode.get(normalize(code));
    if (!plantation) {
      errors.push({ row, message: `Plantation « ${code} » introuvable dans votre secteur.` });
      return;
    }
    if (seen.has(plantation.id)) {
      errors.push({
        row,
        message: `La plantation ${plantation.code} figure déjà dans le fichier.`,
      });
      return;
    }
    seen.add(plantation.id);
    if (name === '') {
      unchanged += 1;
      return;
    }
    const allowed = sectionsFor(plantation, sections, lots, sectors);
    const section = allowed.find((s) => normalize(s.name) === normalize(name));
    if (!section) {
      const exists = sections.some((s) => normalize(s.name) === normalize(name));
      errors.push({
        row,
        message: exists
          ? `La section « ${name} » n’est pas dans le lot ${plantation.lot} de ${plantation.code}.`
          : `Section « ${name} » introuvable : créez-la d’abord dans Paramètres.`,
      });
      return;
    }
    if (plantation.sectionId === section.id) {
      unchanged += 1;
      return;
    }
    ready.push({ plantation, section });
  });

  return { ready, errors, unchanged };
}

/** Lignes du modèle Excel : toutes les plantations du périmètre, section à remplir. */
export function assignmentTemplateRows(
  plantations: readonly Plantation[],
): readonly (readonly (string | number)[])[] {
  return [
    ['Plantation', 'Planteur', 'Lot', 'Section'],
    ...[...plantations]
      .sort((a, b) => a.lot - b.lot || a.code.localeCompare(b.code, 'fr'))
      .map((p) => [p.code, p.planter.name, p.lot, p.sectionName ?? '']),
  ];
}
