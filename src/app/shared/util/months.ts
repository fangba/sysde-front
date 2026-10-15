const LONG = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

const SHORT = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
] as const;

function parse(month: string): { year: number; index: number } {
  const [year, monthNumber] = month.split('-').map(Number);
  return { year: year ?? 0, index: (monthNumber ?? 1) - 1 };
}

/** « 2026-09 » → « Septembre 2026 » */
export function monthLabel(month: string): string {
  const { year, index } = parse(month);
  return `${LONG[index] ?? ''} ${year}`;
}

/** « 2026-09 » → « Sep 26 » */
export function monthShortLabel(month: string): string {
  const { year, index } = parse(month);
  return `${SHORT[index] ?? ''} ${String(year).slice(-2)}`;
}
