export interface NiceScale {
  /** Valeur maximale de l'axe. */
  readonly max: number;
  /** Écart entre deux graduations. */
  readonly step: number;
  /** Graduations de 0 à `max`. */
  readonly ticks: readonly number[];
}

const STEP_FACTORS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] as const;

/**
 * Calcule un axe vertical lisible pour une valeur maximale donnée :
 * un nombre fixe d'intervalles, un écart « rond » (1, 1,5, 2, 2,5, 3, 4, 5, 6, 8 × 10ⁿ).
 */
export function niceScale(maxValue: number, intervals = 4): NiceScale {
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;
  const raw = safeMax / intervals;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = (STEP_FACTORS.find((factor) => factor * magnitude >= raw) ?? 10) * magnitude;
  const ticks = Array.from({ length: intervals + 1 }, (_, i) => Math.round(i * step * 1000) / 1000);
  return { max: step * intervals, step, ticks };
}
