// Formats français : espace fine insécable entre les milliers, virgule décimale.

const INTEGER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const PERCENT = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const PERCENT_ROUNDED = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  maximumFractionDigits: 0,
});

/** 18742 → « 18 742 » */
export function formatInteger(value: number): string {
  return INTEGER.format(value);
}

/** 0.0321 → « 3,2 % » (le signe est à la charge de l'appelant). */
export function formatPercent(fraction: number): string {
  return PERCENT.format(fraction);
}

/** 0.6799 → « 68 % » */
export function formatPercentRounded(fraction: number): string {
  return PERCENT_ROUNDED.format(fraction);
}

/** Date ISO (aaaa-mm-jj) → « jj/mm/aaaa ». */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}
