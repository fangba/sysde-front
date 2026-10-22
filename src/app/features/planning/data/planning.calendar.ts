import { addDays } from '@shared/util/dates';

import type { PlanLine } from './planning.models';
import { spanDays } from './planning.rules';

/** Une case de la grille d'un mois : `null` pour les cases vides avant le 1er. */
export type MonthCell = number | null;

/** Cases d'un mois (semaines du lundi au dimanche, cases vides au début). `month` : 0 à 11. */
export function monthCells(year: number, month: number): MonthCell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
}

/** Date ISO (aaaa-mm-jj) d'un jour d'un mois (`month` : 0 à 11). */
export function isoOf(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Regroupe les lignes par jour : une ligne figure sur chacun des jours de sa période. */
export function linesByDate(lines: readonly PlanLine[]): ReadonlyMap<string, readonly PlanLine[]> {
  const map = new Map<string, PlanLine[]>();
  for (const line of lines) {
    for (let i = 0; i < spanDays(line); i++) {
      const iso = addDays(line.date, i);
      const list = map.get(iso);
      if (list) {
        list.push(line);
      } else {
        map.set(iso, [line]);
      }
    }
  }
  return map;
}

const MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' });
const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function monthName(year: number, month: number): string {
  return MONTH_FORMAT.format(new Date(Date.UTC(year, month, 1)));
}

/** « jeudi 5 février 2026 » */
export function longDate(iso: string): string {
  return DAY_FORMAT.format(new Date(`${iso}T00:00:00.000Z`));
}

/** Initiales des jours, du lundi au dimanche. */
export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
