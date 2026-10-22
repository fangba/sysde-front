import { addDays, daysBetween } from '@shared/util/dates';

import type { ActivityCategory } from '../../settings/data/settings.models';
import type { PlanLine } from '../../planning/data/planning.models';

export type FieldPoste = 'MO' | 'FS' | 'CF' | 'CO' | 'ES';

/** Textes propres à un poste de terrain : titre et règles d'encadrement du cahier des charges. */
export interface FieldProfile {
  readonly title: string;
  readonly subtitle: string;
  readonly rules: readonly string[];
}

export const FIELD_PROFILES: Readonly<Record<FieldPoste, FieldProfile>> = {
  MO: {
    title: 'Dashboard du moniteur',
    subtitle: 'Votre planning, vos visites de plantation et vos groupes de vulgarisation.',
    rules: [
      'Visite de plantation : 4 par an et par plantation, soit 1 par trimestre (plantations de moins de 25 ha).',
      'Perfectionnement in situ : 3 saigneurs par mois dans votre section, 1 par semaine.',
      'Groupe de vulgarisation : 6 groupes, 1 animation par trimestre et par groupe.',
      'Découverte du verger : géolocalisation faite au fil de l’eau, hors planning.',
      'Chaque activité donne lieu à une liste de présence, une évaluation (formations) et un rapport.',
    ],
  },
  FS: {
    title: 'Dashboard du formateur de saignée',
    subtitle: 'Votre planning et vos sessions de formation initiale des nouveaux saigneurs.',
    rules: [
      'Formation initiale : 1 session par mois dans votre lot, soit 12 par an.',
      'Une session dure 20 jours et accueille 20 apprenants.',
      'Chaque lot dispose de deux écoles de saignée : une école sèche et une école verte.',
      'Liste de présence chaque jour, évaluation et rapport en fin de formation.',
    ],
  },
  CF: {
    title: 'Dashboard du contrôleur de saignée',
    subtitle: 'Votre planning de formations, de perfectionnements et de suivis dans votre lot.',
    rules: [
      'Formation initiale : 1 session par semestre, soit 2 par an (20 jours).',
      'Perfectionnement in situ : 9 saigneurs par mois dans votre lot, 3 par semaine.',
      'Recyclage des saigneurs : 1 fois par an sur 3 jours, généralement de février à mars.',
      'Suivi post-perfectionnement : chaque mois, la moitié des moniteurs du lot, 1 saigneur tiré au hasard chez chacun.',
      'Liste de présence, évaluation et rapport à chaque activité.',
    ],
  },
  CO: {
    title: 'Dashboard du contrôleur ordinaire',
    subtitle: 'Votre planning de visites de plantation et de visites de conformité.',
    rules: [
      'Visite de plantation : 3 par an et par plantation, soit 1 par trimestre (plantations de 25 à 50 ha).',
      'Visite de conformité : 6 par mois, sur une plantation tirée au hasard chez chacun de vos 6 moniteurs.',
      'Liste de présence et rapport à chaque visite.',
    ],
  },
  ES: {
    title: "Dashboard de l'équipe spéciale",
    subtitle: 'Votre planning de visites d’intervention sur les plantations du secteur.',
    rules: [
      'Visite d’intervention : 1 par semestre et par plantation, soit 2 par an.',
      'Vous intervenez sur l’ensemble des plantations du secteur.',
      'Liste de présence et rapport à chaque visite.',
    ],
  },
};

export function isFieldPoste(poste: string | undefined): poste is FieldPoste {
  return poste !== undefined && poste in FIELD_PROFILES;
}

/** Jours d'activité de chaque mois de l'année (une ligne compte pour chacun de ses jours). */
export function daysPerMonth(lines: readonly PlanLine[], year: number): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  for (const line of lines) {
    const count = daysBetween(line.date, line.endDate);
    for (let i = 0; i < count; i++) {
      const iso = addDays(line.date, i);
      if (iso.startsWith(`${year}-`)) {
        const index = Number(iso.slice(5, 7)) - 1;
        months[index] = (months[index] ?? 0) + 1;
      }
    }
  }
  return months;
}

/** Jours d'activité par catégorie. */
export function daysPerCategory(
  lines: readonly PlanLine[],
  categoryOf: (activityId: string) => ActivityCategory | undefined,
): Record<ActivityCategory, number> {
  const totals: Record<ActivityCategory, number> = { FORMATION: 0, VISITE: 0, RENCONTRE: 0 };
  for (const line of lines) {
    const category = categoryOf(line.activityId);
    if (category) {
      totals[category] += daysBetween(line.date, line.endDate);
    }
  }
  return totals;
}

/** Activités en cours ou à venir à partir de `today`, de la plus proche à la plus lointaine. */
export function upcoming(lines: readonly PlanLine[], today: string, limit: number): PlanLine[] {
  return lines
    .filter((line) => line.endDate >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

/** Jours avant le début d'une activité ; 0 si elle est déjà commencée. */
export function daysUntil(line: Pick<PlanLine, 'date'>, today: string): number {
  return Math.max(0, daysBetween(today, line.date) - 1);
}

/** Activités qui ont lieu, en tout ou partie, dans le mois (`month` : 1 à 12). */
export function inMonth(lines: readonly PlanLine[], year: number, month: number): PlanLine[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const last = addDays(
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`,
    -1,
  );
  return lines.filter((line) => line.date <= last && line.endDate >= first);
}

/** Part des objectifs annuels couverte par le planning (0 à 1), `null` sans objectif. */
export function objectiveRate(
  objectives: readonly { planned: number; target: number }[],
): number | null {
  const target = objectives.reduce((sum, o) => sum + o.target, 0);
  if (target === 0) {
    return null;
  }
  const covered = objectives.reduce((sum, o) => sum + Math.min(o.planned, o.target), 0);
  return covered / target;
}
