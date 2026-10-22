import { toPlantation } from './plantations.mapper';
import type { PlantationDto } from './plantations.models';

const BASE: PlantationDto = {
  id: 'p1',
  code: 'PL-001',
  planteur_nom: 'Kouassi Adjoua',
  operateur: 'SAPH',
  secteur_code: 'S01',
  secteur_nom: 'Aboisso',
  lot: 2,
  section: 'A',
  superficie_ha: 54,
};

describe('toPlantation', () => {
  it('renseigne les champs facultatifs absents par défaut', () => {
    const p = toPlantation(BASE);
    expect(p.planter.phone).toBe('—');
    expect(p.village).toBe('—');
    expect(p.clone).toBe('—');
    expect(p.stage).toBe('JEUNE');
    expect(p.geolocated).toBe(false);
  });

  it('déduit l’état et la géolocalisation', () => {
    const p = toPlantation({
      ...BASE,
      en_saignee: true,
      latitude: 5.4,
      longitude: -3.2,
      annee_plantation: 2012,
    });
    expect(p.stage).toBe('SAIGNEE');
    expect(p.geolocated).toBe(true);
    expect(p.plantedYear).toBe(2012);
  });
});
