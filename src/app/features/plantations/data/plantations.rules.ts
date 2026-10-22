import type { Plantation } from './plantations.models';

export interface PlantationFilter {
  readonly operator: string;
  readonly sector: string;
}

export const ALL = 'ALL';

export function applyFilter(
  rows: readonly Plantation[],
  filter: PlantationFilter,
): readonly Plantation[] {
  return rows.filter(
    (p) =>
      (filter.operator === ALL || p.operator === filter.operator) &&
      (filter.sector === ALL || `${p.operator}/${p.sectorCode}` === filter.sector),
  );
}

export interface PlantationTotals {
  readonly count: number;
  readonly planters: number;
  readonly hectares: number;
  /** Part des plantations géolocalisées, entre 0 et 1. */
  readonly geolocatedRate: number;
}

export function totalsOf(rows: readonly Plantation[]): PlantationTotals {
  const geolocated = rows.filter((p) => p.geolocated).length;
  return {
    count: rows.length,
    planters: new Set(rows.map((p) => p.planter.name)).size,
    hectares: rows.reduce((sum, p) => sum + p.hectares, 0),
    geolocatedRate: rows.length ? geolocated / rows.length : 0,
  };
}
