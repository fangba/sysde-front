import type { Plantation, PlantationDto } from './plantations.models';

const UNKNOWN = '—';

/** Convertit un enregistrement de l'API externe ; tolère les champs facultatifs absents. */
export function toPlantation(dto: PlantationDto): Plantation {
  return {
    id: dto.id,
    code: dto.code,
    planter: { name: dto.planteur_nom, phone: dto.planteur_telephone?.trim() || UNKNOWN },
    village: dto.village?.trim() || UNKNOWN,
    operator: dto.operateur,
    sectorCode: dto.secteur_code,
    sectorName: dto.secteur_nom,
    lot: dto.lot,
    section: dto.section,
    ...(dto.section_id ? { sectionId: dto.section_id, sectionName: dto.section_nom ?? '' } : {}),
    hectares: dto.superficie_ha,
    plantedYear: dto.annee_plantation ?? 0,
    clone: dto.clone?.trim() || UNKNOWN,
    stage: dto.en_saignee ? 'SAIGNEE' : 'JEUNE',
    geolocated: typeof dto.latitude === 'number' && typeof dto.longitude === 'number',
  };
}
