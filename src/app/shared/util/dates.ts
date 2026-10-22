// Dates ISO (aaaa-mm-jj) : comparaisons textuelles sûres, calculs en UTC pour ignorer l'heure d'été.

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parts(iso: string): [number, number, number] {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return [year ?? 0, month ?? 1, day ?? 1];
}

/** Date du jour au format ISO, dans le fuseau local. */
export function todayIso(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Fin d'une période de `years` ans commençant à `startIso` (veille de l'anniversaire). */
export function endOfPeriod(startIso: string, years: number): string {
  const [year, month, day] = parts(startIso);
  const end = new Date(Date.UTC(year + years, month - 1, day));
  end.setUTCDate(end.getUTCDate() - 1);
  return toIso(end);
}

/** Deux périodes (bornes incluses) se chevauchent-elles ? */
export function periodsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Année d'une date ISO. */
export function yearOf(iso: string): number {
  return parts(iso)[0];
}

/** Vrai si la chaîne est une date ISO existante (rejette le 31 février). */
export function isValidIso(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return false;
  }
  const [year, month, day] = parts(iso);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Ajoute `days` jours (négatif accepté) à une date ISO. */
export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Nombre de jours d'une période, bornes incluses. */
export function daysBetween(startIso: string, endIso: string): number {
  const ms = Date.parse(`${endIso}T00:00:00.000Z`) - Date.parse(`${startIso}T00:00:00.000Z`);
  return Math.round(ms / 86_400_000) + 1;
}
