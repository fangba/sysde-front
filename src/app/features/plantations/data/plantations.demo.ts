import { buildCatalog, buildPlantations } from '../../map/data/map.demo';
import type { Plantation } from './plantations.models';

const VILLAGES = ['Ayamé', 'Bonoua', 'Adiaké', 'Grand-Bassam', 'Niablé', 'Tiapoum', 'Maféré'];
const CLONES = ['GT 1', 'PB 217', 'PB 235', 'IRCA 41', 'IRCA 230'];

/** Plantations de démonstration : celles de la carte, complétées de façon déterministe. */
export function buildDemoPlantations(): readonly Plantation[] {
  const catalog = buildCatalog();
  return buildPlantations().map((p, index) => {
    const operator = catalog.find((o) => o.id === p.operatorId);
    const sector = operator?.sectors.find((s) => s.id === p.sectorId);
    const plantedYear = 2005 + ((index * 7) % 18);
    return {
      id: p.id,
      code: p.name.replace('Plantation ', 'PL-'),
      planter: {
        name: p.owner,
        phone: `07 ${String(10 + (index % 80)).padStart(2, '0')} ${String(20 + ((index * 3) % 70))} ${String(10 + ((index * 7) % 80))} ${String(10 + ((index * 11) % 80))}`,
      },
      village: VILLAGES[index % VILLAGES.length] ?? VILLAGES[0] ?? '',
      operator: operator?.acronym ?? '',
      sectorCode: sector?.code ?? '',
      sectorName: sector?.name ?? '',
      lot: p.lot,
      section: p.section,
      hectares: p.hectares,
      plantedYear,
      clone: CLONES[index % CLONES.length] ?? CLONES[0] ?? '',
      stage: new Date().getFullYear() - plantedYear >= 7 ? 'SAIGNEE' : 'JEUNE',
      geolocated: index % 9 !== 0,
    };
  });
}
