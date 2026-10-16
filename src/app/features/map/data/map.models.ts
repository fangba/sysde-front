/** Lot d'un secteur et ses sections. */
export interface MapLotOption {
  readonly lot: number;
  readonly sections: readonly string[];
}

/** Secteur attribué à un opérateur, avec ses lots. */
export interface MapSectorOption {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly lots: readonly MapLotOption[];
}

/** Opérateur technique et les secteurs dont il a la charge (`GET /carte/catalogue`). */
export interface MapOperatorOption {
  readonly id: string;
  readonly acronym: string;
  readonly name: string;
  readonly sectors: readonly MapSectorOption[];
}

/** Critères de la carte ; l'opérateur est obligatoire, le secteur et le lot affinent. */
export interface MapFilter {
  readonly operatorId: string;
  readonly sectorId?: string;
  readonly lot?: number;
  /** Section du lot choisi (chef de secteur). */
  readonly section?: string;
}

/** Plantation encadrée, délimitée par un polygone sur la carte (`GET /carte/plantations`). */
export interface MapPlantation {
  readonly id: string;
  /** Nom de la plantation. */
  readonly name: string;
  /** Planteur propriétaire. */
  readonly owner: string;
  readonly operatorId: string;
  readonly sectorId: string;
  readonly lot: number;
  readonly section: string;
  readonly hectares: number;
  /** Contour de la parcelle, sommets [latitude, longitude] dans l'ordre. */
  readonly polygon: readonly (readonly [number, number])[];
}
