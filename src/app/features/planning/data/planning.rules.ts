import { formatDate } from '@shared/util/format';
import type { Tone } from '@shared/models/tone';
import { addDays, daysBetween, isValidIso, yearOf } from '@shared/util/dates';

import { frequencyLabel, periodInfo } from '../../settings/data/settings.rules';
import type {
  Activity,
  ActivityFrequency,
  FrequencyPeriod,
} from '../../settings/data/settings.models';
import type {
  ActivityStatus,
  ActivitySubmission,
  AnnualPlan,
  PlanLine,
  PlanLineInput,
  PlanStatus,
} from './planning.models';

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

/**
 * Séances attendues sur l'année pour l'ensemble de l'activité ; `null` sans fréquence, ou quand
 * elle s'applique « par plantation / saigneur… » (le total dépend alors du nombre d'unités).
 */
export function annualTotal(frequency: ActivityFrequency | null): number | null {
  if (!frequency || frequency.unit) {
    return null;
  }
  return frequency.count * periodInfo(frequency.period).perYear;
}

/** Une entrée par activité dont le total annuel est connu. */
export function objectives(
  activities: readonly Activity[],
  lines: readonly PlanLineInput[],
): Objective[] {
  return activities.flatMap((activity) => {
    const target = annualTotal(activity.frequency);
    return target === null
      ? []
      : [{ activity, planned: lines.filter((l) => l.activityId === activity.id).length, target }];
  });
}

/**
 * Objectif de chaque activité qui a une fréquence, y compris « par plantation / saigneur… » :
 * dans ce cas l'objectif est celui d'une unité multiplié par le nombre d'unités (lots ou
 * sections) déjà présentes dans le planning pour cette activité, avec au moins une.
 */
export function annualOverview(
  activities: readonly Activity[],
  lines: readonly PlanLineInput[],
): Objective[] {
  return activities.flatMap((activity) => {
    const frequency = activity.frequency;
    if (!frequency) {
      return [];
    }
    const own = lines.filter((l) => l.activityId === activity.id);
    const perUnit = frequency.count * periodInfo(frequency.period).perYear;
    const units = frequency.unit ? Math.max(1, new Set(own.map((l) => l.place.trim())).size) : 1;
    return [{ activity, planned: own.length, target: perUnit * units }];
  });
}

/** Résultat du contrôle des dates d'une activité face à sa fréquence. */
export interface FrequencyCheck {
  /** Toutes les dates sont cohérentes avec la fréquence demandée. */
  readonly ok: boolean;
  /** Séances attendues sur l'année ; `null` sans fréquence ou si elle dépend d'un nombre d'unités. */
  readonly expected: number | null;
  /** Séances programmées. */
  readonly actual: number;
  /** Ce qui n'est pas cohérent, en français ; vide si `ok`. */
  readonly issues: readonly string[];
}

export { frequencyLabel };

const plural = (n: number, word: string): string => `${n} ${word}${n > 1 ? 's' : ''}`;

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** Périodes d'une année pour une fréquence : libellé (vide pour l'année entière) et mois couverts. */
function periodsOf(period: FrequencyPeriod): { label: string; months: readonly number[] }[] {
  switch (period) {
    case 'YEAR':
      return [{ label: '', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }];
    case 'SEMESTER':
      return [
        { label: 'au 1er semestre', months: [1, 2, 3, 4, 5, 6] },
        { label: 'au 2e semestre', months: [7, 8, 9, 10, 11, 12] },
      ];
    case 'MONTH':
      return MONTH_NAMES.map((name, i) => ({
        label: `en ${name}`,
        months: [i + 1],
      }));
  }
}

/**
 * Vérifie les dates programmées d'une activité :
 * 1. pour chaque période de la fréquence (année, semestre ou mois), le nombre de séances est celui
 *    demandé ; quand la fréquence est « par plantation / saigneur… », chaque lot ou section
 *    distinct du planning (colonne « Lot / section ») doit atteindre ce nombre ;
 * 2. chaque séance dure le nombre de jours prévu pour l'activité ;
 * 3. deux séances d'un même lot ou section ne se chevauchent pas.
 * Les unités qui n'apparaissent pas du tout dans le planning ne peuvent pas être détectées.
 */
export function checkFrequency(
  activity: Pick<Activity, 'frequency' | 'durationDays'>,
  lines: readonly PlanLineInput[],
): FrequencyCheck {
  const sorted = [...lines].sort((a, b) => a.date.localeCompare(b.date));
  const issues: string[] = [];
  const frequency = activity.frequency;

  if (frequency && sorted.length === 0) {
    issues.push("Aucune séance n'est programmée.");
  } else if (frequency) {
    const groups = new Map<string, PlanLineInput[]>();
    for (const line of sorted) {
      const key = frequency.unit ? line.place.trim() : '';
      groups.set(key, [...(groups.get(key) ?? []), line]);
    }
    for (const [place, group] of groups) {
      for (const { label, months } of periodsOf(frequency.period)) {
        const n = group.filter((l) => months.includes(Number(l.date.slice(5, 7)))).length;
        if (n !== frequency.count) {
          issues.push(
            `${place ? `${place} : ` : ''}${plural(n, 'séance')} programmée${n > 1 ? 's' : ''}` +
              `${label ? ` ${label}` : ''} pour ${plural(frequency.count, 'séance')} attendue${frequency.count > 1 ? 's' : ''}.`,
          );
        }
      }
    }
  }
  for (const line of sorted) {
    const days = spanDays(line);
    if (days !== activity.durationDays) {
      issues.push(
        `La séance du ${formatPeriod(line)} dure ${plural(days, 'jour')} au lieu de ${plural(activity.durationDays, 'jour')}.`,
      );
    }
  }
  const lastOf = new Map<string, PlanLineInput>();
  for (const line of sorted) {
    const key = frequency?.unit ? line.place.trim() : '';
    const previous = lastOf.get(key);
    if (previous && line.date <= previous.endDate) {
      issues.push(
        `Les séances du ${formatPeriod(previous)} et du ${formatPeriod(line)} se chevauchent.`,
      );
    }
    if (!previous || line.endDate > previous.endDate) {
      lastOf.set(key, line);
    }
  }
  return {
    ok: issues.length === 0,
    expected: annualTotal(frequency),
    actual: sorted.length,
    issues,
  };
}

/** Message affiché après le contrôle d'une activité : information si cohérent, alerte sinon. */
export function checkMessage(
  activity: Pick<Activity, 'label' | 'frequency'>,
  check: FrequencyCheck,
): { readonly tone: 'info' | 'warning'; readonly text: string } {
  if (check.ok) {
    return {
      tone: 'info',
      text:
        activity.frequency === null
          ? `Les dates de « ${activity.label} » sont cohérentes (aucune fréquence n'est définie pour cette activité).`
          : `L'ensemble des dates de « ${activity.label} » sont cohérentes avec la fréquence demandée (${frequencyLabel(activity)}).`,
    };
  }
  const more = check.issues.length - 1;
  return {
    tone: 'warning',
    text:
      `Des dates de « ${activity.label} » ne sont pas cohérentes : ${check.issues[0]}` +
      (more > 0 ? ` (et ${plural(more, 'autre point')}, voir le détail dans « Détails »)` : ''),
  };
}

/** Message affiché après le contrôle de toutes les activités. */
export function checkAllMessage(
  results: readonly {
    readonly activity: Pick<Activity, 'label'>;
    readonly check: FrequencyCheck;
  }[],
): { readonly tone: 'info' | 'warning'; readonly text: string } {
  const failed = results.filter((r) => !r.check.ok);
  if (failed.length === 0) {
    return {
      tone: 'info',
      text: `Les dates des ${plural(results.length, 'activité')} sont cohérentes.`,
    };
  }
  return {
    tone: 'warning',
    text: `${failed.length} activité${failed.length > 1 ? 's' : ''} sur ${results.length} comporte${failed.length > 1 ? 'nt' : ''} des dates non cohérentes : ${failed.map((r) => r.activity.label).join(', ')}.`,
  };
}

const HOURS_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** 6 → « 6 », 2.5 → « 2,5 » */
export function formatHours(hours: number): string {
  return HOURS_FORMAT.format(hours);
}

export function isEditable(status: PlanStatus): boolean {
  return status === 'BROUILLON';
}

/** Soumission propre à une activité, s'il y en a une. */
export function submissionOf(
  plan: Pick<AnnualPlan, 'submissions'> | null | undefined,
  activityId: string,
): ActivitySubmission | undefined {
  return plan?.submissions?.find((s) => s.activityId === activityId);
}

/** Les dates d'une activité ne se modifient plus : planning soumis ou activité soumise/validée. */
export function isActivityLocked(
  plan: Pick<AnnualPlan, 'status' | 'submissions'> | null | undefined,
  activityId: string,
): boolean {
  if (!plan || !isEditable(plan.status)) {
    return true;
  }
  const status = submissionOf(plan, activityId)?.status;
  return status === 'SOUMIS' || status === 'VALIDE';
}

/** Libellé et teinte de l'état de soumission d'une activité. */
export function activityStatusView(status: ActivityStatus): {
  readonly label: string;
  readonly tone: Tone;
} {
  switch (status) {
    case 'SOUMIS':
      return { label: 'Soumis', tone: 'amber' };
    case 'VALIDE':
      return { label: 'Validé', tone: 'green' };
    case 'REJETE':
      return { label: 'Rejeté', tone: 'red' };
  }
}

/** Remplace (ou ajoute) l'état de soumission d'une activité ; `null` le retire. */
export function withSubmission(
  plan: Pick<AnnualPlan, 'submissions'>,
  activityId: string,
  next: ActivitySubmission | null,
): readonly ActivitySubmission[] {
  const others = (plan.submissions ?? []).filter((s) => s.activityId !== activityId);
  return next ? [...others, next] : others;
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

/** Colonnes du fichier d'import (la plantation n'y figure pas). */
type ImportKey = Exclude<keyof PlanLineInput, 'plantation'>;

const HEADER_ALIASES: Readonly<Record<ImportKey, readonly string[]>> = {
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
  const columns = {} as Record<ImportKey, number>;
  const missing: string[] = [];
  (Object.keys(HEADER_ALIASES) as ImportKey[]).forEach((key, index) => {
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
