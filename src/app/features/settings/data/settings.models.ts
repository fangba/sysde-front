/** ORGANISME : APROMAC ou FIRCA (administrateurs). TECHNIQUE : opérateur d'encadrement. */
export type OperatorType = 'ORGANISME' | 'TECHNIQUE';

export interface Operator {
  readonly id: string;
  readonly acronym: string;
  readonly name: string;
  readonly type: OperatorType;
  readonly email: string;
  readonly phone: string;
  readonly active: boolean;
}
export type OperatorInput = Omit<Operator, 'id'>;

/** Donnée de référence : zone géographique d'encadrement, divisée en lots. */
export interface Sector {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export type SectorInput = Omit<Sector, 'id'>;

/** Donnée de référence : subdivision numérotée d'un secteur. */
export interface Lot {
  readonly id: string;
  readonly sectorId: string;
  readonly number: number;
  readonly description: string;
}
export type LotInput = Omit<Lot, 'id'>;

export const CONTRACT_YEARS = 3;

/** Contrat triennal d'un opérateur technique. Dates ISO (aaaa-mm-jj), bornes incluses. */
export interface Contract {
  readonly id: string;
  readonly reference: string;
  readonly operatorId: string;
  readonly startDate: string;
  readonly endDate: string;
}
export type ContractInput = Omit<Contract, 'id'>;

/**
 * Attribution : ensemble des lots d'un secteur confiés à un opérateur, pour la période
 * de son contrat. Il n'en existe qu'une par couple contrat / secteur.
 */
export interface Attribution {
  readonly id: string;
  readonly contractId: string;
  readonly sectorId: string;
  readonly lots: readonly number[];
}
export type AttributionInput = Omit<Attribution, 'id'>;

/** Exercice annuel d'un contrat, rattaché à une attribution (un lot d'un secteur). */
export interface Exercise {
  readonly id: string;
  readonly attributionId: string;
  readonly contractId: string;
  readonly sectorId: string;
  readonly year: number;
  readonly closingDate: string;
}
export type ExerciseInput = Omit<Exercise, 'id'>;

export type Poste = 'CD' | 'CS' | 'CF' | 'CO' | 'FO' | 'MO' | 'ES' | 'SE' | 'SU' | 'DI';

export interface User {
  readonly id: string;
  readonly lastName: string;
  readonly firstName: string;
  readonly email: string;
  readonly phone: string;
  readonly operatorId: string;
  readonly poste: Poste;
  /** Secteur d'affectation (chefs de secteur et collaborateurs) ; absent pour les autres postes. */
  readonly sectorId?: string;
  readonly active: boolean;
}
export type UserInput = Omit<User, 'id'>;
