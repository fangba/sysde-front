import { formatDate } from '@shared/util/format';
import type { Tone } from '@shared/models/tone';
import { addDays, daysBetween, isValidIso, yearOf } from '@shared/util/dates';

import type { Activity } from '../../settings/data/settings.models';
import type { AnnualPlan, PlanLine, PlanLineInput, PlanStatus } from './planning.models';

export const MAX_HOURS = 12;
export const MAX_PLACE_LENGTH = 60;
export const MAX_IMPORT_ROWS = 2000;

export const TEMPLATE_HEADERS = [
  'Date début',
  'Date fin',
  'Activité',
  'Lot / section',
  'Heures par jour',
] as const;

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Règle d'une ligne ; renvoie le message d'erreur, ou `null` si la ligne est correcte.
 * `allowed` : identifiants des activités que le poste peut inscrire (tous si absent).
 */
export function validateLine(
  line: PlanLineInput,
  year: number,
  others: readonly PlanLine[],
  selfId?: string,
  allowed?: ReadonlySet<string>,
): string | null {
  if (!isValidIso(line.date)) {
    return "La date n'est pas valide.";
  }
  if (yearOf(line.date) !== year) {
    return `La date doit être dans l'année ${year}.`;
  }
  if (!isValidIso(line.endDate)) {
    return "La date de fin n'est pas valide.";
  }
  if (line.endDate < line.date) {
    return 'La date de fin ne peut pas précéder la date de début.';
  }
  if (yearOf(line.endDate) !== year) {
    return `La date de fin doit être dans l'année ${year}.`;
  }
  if (!line.activityId || (allowed && !allowed.has(line.activityId))) {
    return "Cette activité n'est pas proposée à votre poste.";
  }
  const place = line.place.trim();
  if (!place) {
    return 'Le lot ou la section est obligatoire.';
  }
  if (place.length > MAX_PLACE_LENGTH) {
    return `Le lot ou la section ne peut pas dépasser ${MAX_PLACE_LENGTH} caractères.`;
  }
  if (!Number.isFinite(line.hours) || line.hours <= 0 || line.hours > MAX_HOURS) {
    return `Les heures par jour doivent être comprises entre 0 et ${MAX_HOURS}.`;
  }
  const key = lineKey(line);
  if (others.some((other) => other.id !== selfId && lineKey(other) === key)) {
    return 'Cette activité est déjà prévue ce jour-là pour ce lot ou cette section.';
  }
  return null;
}

function lineKey(line: PlanLineInput): string {
  return `${line.date}|${line.activityId}|${normalizeText(line.place)}`;
}

/** Nombre de jours d'une ligne, bornes incluses. */
export function spanDays(line: Pick<PlanLineInput, 'date' | 'endDate'>): number {
  return daysBetween(line.date, line.endDate);
}

/** « 05/02/2026 » pour un jour, « 05/02/2026 → 24/02/2026 » pour une période. */
export function formatPeriod(line: Pick<PlanLineInput, 'date' | 'endDate'>): string {
  return line.endDate === line.date
    ? formatDate(line.date)
    : `${formatDate(line.date)} → ${formatDate(line.endDate)}`;
}

/** Dernier jour d'une séance qui commence le `start` et dure `durationDays` jours. */
export function endFor(start: string, durationDays: number): string {
  return addDays(start, Math.max(1, durationDays) - 1);
}

/** Trie par date, puis par type d'activité. */
export function sortLines<T extends PlanLineInput>(lines: readonly T[]): T[] {
  return [...lines].sort(
    (a, b) => a.date.localeCompare(b.date) || a.activityId.localeCompare(b.activityId),
  );
}

export interface PlanSummary {
  readonly count: number;
  readonly hours: number;
  readonly days: number;
}

export function summarize(lines: readonly PlanLineInput[]): PlanSummary {
  const hours = lines.reduce((sum, line) => sum + line.hours * spanDays(line), 0);
  const days = new Set<string>();
  for (const line of lines) {
    for (let i = 0; i < spanDays(line); i++) {
      days.add(addDays(line.date, i));
    }
  }
  return { count: lines.length, hours: Math.round(hours * 100) / 100, days: days.size };
}

/** Avancement d'une activité : séances prévues au planning face à l'objectif annuel. */
export interface Objective {
  readonly activity: Activity;
  readonly planned: number;
  readonly target: number;
}

/** Une entrée par activité ayant un objectif annuel. */
export function objectives(
  activities: readonly Activity[],
  lines: readonly PlanLineInput[],
): Objective[] {
  return activities.flatMap((activity) =>
    activity.annualTarget === null
      ? []
      : [
          {
            activity,
            planned: lines.filter((l) => l.activityId === activity.id).length,
            target: activity.annualTarget,
          },
        ],
  );
}

const HOURS_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** 6 → « 6 », 2.5 → « 2,5 » */
export function formatHours(hours: number): string {
  return HOURS_FORMAT.format(hours);
}

export function isEditable(status: PlanStatus): boolean {
  return status === 'BROUILLON';
}

/** Libellé et teinte d'un planning ; un brouillon rejeté se distingue d'un brouillon neuf. */
export function planStatusView(plan: Pick<AnnualPlan, 'status' | 'rejection'>): {
  readonly label: string;
  readonly tone: Tone;
} {
  switch (plan.status) {
    case 'VALIDE':
      return { label: 'Validé', tone: 'green' };
    case 'SOUMIS':
      return { label: 'À valider', tone: 'amber' };
    default:
      return plan.rejection
        ? { label: 'Rejeté', tone: 'red' }
        : { label: 'Brouillon', tone: 'neutral' };
  }
}

export interface ImportError {
  /** Numéro de la ligne dans le fichier (1 = en-tête). */
  readonly row: number;
  readonly message: string;
}

export interface ImportResult {
  readonly lines: readonly PlanLineInput[];
  readonly errors: readonly ImportError[];
}

const HEADER_ALIASES: Readonly<Record<keyof PlanLineInput, readonly string[]>> = {
  date: ['date debut', 'date', 'debut', 'jour'],
  endDate: ['date fin', 'fin'],
  activityId: ['activite', 'type d activite', 'type activite'],
  place: ['lot / section', 'lot/section', 'lot', 'section', 'lieu', 'lot section'],
  hours: ['heures par jour', 'duree (heures)', 'duree', 'duree (h)', 'heures'],
};

function isBlank(cell: unknown): boolean {
  return cell === null || cell === undefined || (typeof cell === 'string' && cell.trim() === '');
}

function dateToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Date saisie dans le fichier : date Excel, « jj/mm/aaaa » ou « aaaa-mm-jj ». */
export function parseDateCell(cell: unknown): string | null {
  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime()) ? null : dateToIso(cell);
  }
  if (typeof cell !== 'string') {
    return null;
  }
  const text = cell.trim();
  const french = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  const iso = french
    ? `${french[3]}-${french[2]!.padStart(2, '0')}-${french[1]!.padStart(2, '0')}`
    : text.slice(0, 10);
  return isValidIso(iso) ? iso : null;
}

function parseHoursCell(cell: unknown): number | null {
  if (typeof cell === 'number') {
    return cell;
  }
  if (typeof cell === 'string') {
    const value = Number(cell.trim().replace(',', '.'));
    return cell.trim() !== '' && Number.isFinite(value) ? value : null;
  }
  return null;
}

function activityIdOf(cell: unknown, activities: readonly Activity[]): string | null {
  if (typeof cell !== 'string') {
    return null;
  }
  const wanted = normalizeText(cell);
  return activities.find((a) => normalizeText(a.label) === wanted)?.id ?? null;
}

/**
 * Transforme les lignes d'une feuille Excel en lignes de planning. La première ligne non vide
 * est l'en-tête (l'ordre des colonnes importe peu). Tout ou rien : l'appelant n'importe que si
 * `errors` est vide.
 */
export function parsePlanRows(
  rows: readonly (readonly unknown[])[],
  year: number,
  activities: readonly Activity[],
): ImportResult {
  const allowed = new Set(activities.map((a) => a.id));
  const headerIndex = rows.findIndex((row) => row.some((cell) => !isBlank(cell)));
  if (headerIndex < 0) {
    return { lines: [], errors: [{ row: 1, message: 'Le fichier est vide.' }] };
  }
  const header = rows[headerIndex]!.map((cell) => normalizeText(String(cell ?? '')));
  const columns = {} as Record<keyof PlanLineInput, number>;
  const missing: string[] = [];
  (Object.keys(HEADER_ALIASES) as (keyof PlanLineInput)[]).forEach((key, index) => {
    const column = header.findIndex((name) => HEADER_ALIASES[key].includes(name));
    columns[key] = column;
    if (column < 0 && key !== 'endDate') {
      missing.push(TEMPLATE_HEADERS[index]!);
    }
  });
  if (missing.length > 0) {
    return {
      lines: [],
      errors: [
        {
          row: headerIndex + 1,
          message: `Colonne manquante : ${missing.join(', ')}. Utilisez le modèle Excel.`,
        },
      ],
    };
  }

  const body = rows.slice(headerIndex + 1);
  if (body.length > MAX_IMPORT_ROWS) {
    return {
      lines: [],
      errors: [
        {
          row: headerIndex + 2 + MAX_IMPORT_ROWS,
          message: `Le fichier dépasse ${MAX_IMPORT_ROWS} lignes.`,
        },
      ],
    };
  }

  const lines: PlanLineInput[] = [];
  const errors: ImportError[] = [];
  body.forEach((cells, offset) => {
    if (cells.every(isBlank)) {
      return;
    }
    const row = headerIndex + offset + 2;
    const date = parseDateCell(cells[columns.date]);
    const endCell = columns.endDate >= 0 ? cells[columns.endDate] : null;
    const endDate = isBlank(endCell) ? null : parseDateCell(endCell);
    const activityId = activityIdOf(cells[columns.activityId], activities);
    const hours = parseHoursCell(cells[columns.hours]);
    const place = String(cells[columns.place] ?? '').trim();
    if (date === null) {
      errors.push({ row, message: "La date n'est pas valide (jj/mm/aaaa)." });
      return;
    }
    if (activityId === null) {
      errors.push({
        row,
        message:
          activities.length === 0
            ? "Aucune activité n'est configurée pour votre poste."
            : `Activité inconnue pour votre poste. Valeurs admises : ${activities.map((a) => a.label).join(', ')}.`,
      });
      return;
    }
    if (hours === null) {
      errors.push({ row, message: 'Les heures par jour ne sont pas un nombre.' });
      return;
    }
    if (!isBlank(endCell) && endDate === null) {
      errors.push({ row, message: "La date de fin n'est pas valide (jj/mm/aaaa)." });
      return;
    }
    const duration = activities.find((a) => a.id === activityId)?.durationDays ?? 1;
    const line: PlanLineInput = {
      date,
      endDate: endDate ?? endFor(date, duration),
      activityId,
      place,
      hours: Math.round(hours * 100) / 100,
    };
    const message = validateLine(
      line,
      year,
      lines.map((l, i) => ({ ...l, id: String(i) })),
      undefined,
      allowed,
    );
    if (message) {
      errors.push({ row, message });
    } else {
      lines.push({ ...line, place });
    }
  });
  if (lines.length === 0 && errors.length === 0) {
    errors.push({
      row: headerIndex + 2,
      message: 'Le fichier ne contient aucune ligne de données.',
    });
  }
  return { lines, errors };
}

/** Lignes du modèle Excel : en-tête et, si le poste a des activités, deux exemples. */
export function templateRows(year: number, activities: readonly Activity[]): (string | number)[][] {
  const first = activities[0];
  const second = activities[1] ?? first;
  return [
    [...TEMPLATE_HEADERS],
    ...(first && second
      ? [
          [
            `05/02/${year}`,
            endFor(`${year}-02-05`, first.durationDays).split('-').reverse().join('/'),
            first.label,
            'Lot 1',
            6,
          ],
          [
            `06/02/${year}`,
            endFor(`${year}-02-06`, second.durationDays).split('-').reverse().join('/'),
            second.label,
            'Section A',
            4,
          ],
        ]
      : []),
  ];
}
