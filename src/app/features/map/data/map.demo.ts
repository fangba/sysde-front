import {
  DEMO_ATTRIBUTIONS,
  DEMO_CONTRACTS,
  DEMO_OPERATORS,
  DEMO_SECTORS,
} from '../../settings/data/settings.demo';
import type { MapOperatorOption, MapPlantation } from './map.models';

/** Centre approximatif de chaque secteur de démonstration. */
const SECTOR_CENTER: Readonly<Record<string, readonly [number, number]>> = {
  'sec-1': [5.47, -3.21],
  'sec-2': [5.29, -3.3],
  'sec-3': [5.79, -6.59],
  'sec-4': [6.13, -5.95],
  'sec-5': [4.65, -6.92],
  'sec-6': [5.33, -4.38],
};

const LAST_NAMES = [
  'Kouassi',
  'Konan',
  'Yao',
  'Koffi',
  'Traoré',
  'Bamba',
  'Coulibaly',
  'N’Guessan',
];
const FIRST_NAMES = ['Adjoua', 'Kouadio', 'Awa', 'Yves', 'Marie', 'Ibrahim', 'Estelle', 'Serge'];
const PLANTATIONS_PER_LOT = 6;
/** Chaque lot est découpé en trois sections (démo). */
const SECTIONS: readonly string[] = ['A', 'B', 'C'];

/** Opérateurs techniques, leurs secteurs et lots, déduits des contrats et attributions. */
export function buildCatalog(): readonly MapOperatorOption[] {
  return DEMO_OPERATORS.filter((o) => o.type === 'TECHNIQUE').map((operator) => {
    const contractIds = new Set(
      DEMO_CONTRACTS.filter((c) => c.operatorId === operator.id).map((c) => c.id),
    );
    const attributions = DEMO_ATTRIBUTIONS.filter((a) => contractIds.has(a.contractId));
    const sectors = DEMO_SECTORS.filter((s) => attributions.some((a) => a.sectorId === s.id)).map(
      (s) => ({
        ...s,
        lots: attributions
          .filter((a) => a.sectorId === s.id)
          .map((a) => ({ lot: a.lot, sections: SECTIONS }))
          .sort((a, b) => a.lot - b.lot),
      }),
    );
    return { id: operator.id, acronym: operator.acronym, name: operator.name, sectors };
  });
}

/** Contour irrégulier à six sommets, dont la surface avoisine `hectares`. */
function polygonAround(
  lat: number,
  lng: number,
  hectares: number,
  seed: number,
): readonly (readonly [number, number])[] {
  const radiusMeters = Math.sqrt((hectares * 10_000) / Math.PI);
  const radiusDeg = radiusMeters / 111_000;
  return Array.from({ length: 6 }, (_, k) => {
    const angle = (k / 6) * 2 * Math.PI + (seed % 7) * 0.1;
    const r = radiusDeg * (0.75 + (((seed + k * 5) * 13) % 50) / 100);
    return [lat + Math.sin(angle) * r, lng + Math.cos(angle) * r] as const;
  });
}

/** Plantations de démonstration : contours fixes, regroupés autour du centre de chaque secteur. */
export function buildPlantations(): readonly MapPlantation[] {
  const plantations: MapPlantation[] = [];
  for (const operator of buildCatalog()) {
    for (const sector of operator.sectors) {
      const center = SECTOR_CENTER[sector.id] ?? [6.5, -5.5];
      for (const { lot } of sector.lots) {
        for (let i = 0; i < PLANTATIONS_PER_LOT; i += 1) {
          // Dispersion déterministe : les mêmes plantations reviennent à chaque chargement.
          const seed = Number(operator.id.slice(3)) * 100 + lot * 10 + i + sector.code.length;
          const angle = seed * 2.399963;
          const spread = 0.015 + ((seed * 37) % 100) / 2500 + lot * 0.006;
          const hectares = 40 + ((seed * 7) % 260);
          const lat = center[0] + Math.sin(angle) * spread;
          const lng = center[1] + Math.cos(angle) * spread;
          const owner = `${LAST_NAMES[(seed + i) % LAST_NAMES.length]} ${FIRST_NAMES[(seed * 3 + lot) % FIRST_NAMES.length]}`;
          plantations.push({
            id: `${operator.id}-${sector.id}-${lot}-${i}`,
            name: `Plantation ${sector.code}-L${lot}-${String(i + 1).padStart(2, '0')}`,
            owner,
            operatorId: operator.id,
            sectorId: sector.id,
            lot,
            section: SECTIONS[i % SECTIONS.length] ?? 'A',
            hectares,
            polygon: polygonAround(lat, lng, hectares, seed),
          });
        }
      }
    }
  }
  return plantations;
}
