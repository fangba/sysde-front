const MS_PER_DAY = 86_400_000;

/**
 * Variation entre les deux dernières valeurs, en fraction (0,032 pour +3,2 %).
 * Retourne 0 quand elle n'est pas calculable.
 */
export function variation(values: readonly number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const current = values[values.length - 1]!;
  const previous = values[values.length - 2]!;
  return previous === 0 ? 0 : (current - previous) / previous;
}

/** Dernière valeur d'une série, ou 0 si elle est vide. */
export function latest(values: readonly number[]): number {
  return values[values.length - 1] ?? 0;
}

/** Garde les `count` dernières valeurs. */
export function lastMonths<T>(items: readonly T[], count: number): readonly T[] {
  return count >= items.length ? items : items.slice(items.length - count);
}

/**
 * Nombre de jours entiers entre `now` et une date ISO (aaaa-mm-jj) ;
 * négatif si la date est passée. Calculé en UTC pour ignorer les changements d'heure.
 */
export function daysUntil(isoDate: string, now: Date): number {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  const target = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / MS_PER_DAY);
}

/** Part d'une valeur dans un total, de 0 à 1. */
export function share(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}
