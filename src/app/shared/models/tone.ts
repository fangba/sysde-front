/** Teinte sémantique des pastilles et des tuiles d'icône. */
export type Tone = 'green' | 'violet' | 'amber' | 'red' | 'neutral';

/** Teinte d'une série de données (graphiques, anneau, légende). */
export type ChartTone = 'green' | 'mint' | 'violet';

/** Variable CSS portant la couleur de chaque teinte de série. */
export const CHART_COLOR_VAR: Readonly<Record<ChartTone, string>> = {
  green: 'var(--chart-green)',
  mint: 'var(--chart-mint)',
  violet: 'var(--chart-violet)',
};
