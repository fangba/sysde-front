/** État de la plantation. */
export type PlantationStage = 'SAIGNEE' | 'JEUNE';

export const STAGE_LABEL: Readonly<Record<PlantationStage, string>> = {
  SAIGNEE: 'En saignée',
  JEUNE: 'Jeune plantation',
};

/**
 * Plantation telle que SysDE l'affiche. Les plantations viennent d'une base externe
 * (voir `plantations.mapper.ts`) : SysDE les consulte, il ne les crée ni ne les modifie.
 */
export interface Plantation {
  readonly id: string;
  readonly code: string;
  readonly planter: { readonly name: string; readonly phone: string };
  readonly village: string;
  readonly operator: string;
  readonly sectorCode: string;
  readonly sectorName: string;
  readonly lot: number;
  readonly section: string;
  readonly hectares: number;
  readonly plantedYear: number;
  readonly clone: string;
  readonly stage: PlantationStage;
  readonly geolocated: boolean;
}

/**
 * Enregistrement renvoyé par l'API externe. Contrat PROVISOIRE : à aligner sur la
 * documentation de l'API quand elle sera fournie ; seul le mapper en dépend.
 */
export interface PlantationDto {
  readonly id: string;
  readonly code: string;
  readonly planteur_nom: string;
  readonly planteur_telephone?: string | null;
  readonly village?: string | null;
  readonly operateur: string;
  readonly secteur_code: string;
  readonly secteur_nom: string;
  readonly lot: number;
  readonly section: string;
  readonly superficie_ha: number;
  readonly annee_plantation?: number | null;
  readonly clone?: string | null;
  readonly en_saignee?: boolean | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
}
