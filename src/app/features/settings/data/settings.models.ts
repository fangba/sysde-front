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

/** Un secteur regroupe `LOTS_PER_SECTOR` lots ; il est créé en dehors de cet écran. */
export interface Sector {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export const LOTS_PER_SECTOR = 3;
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

/** Attribution d'un lot d'un secteur dans le cadre d'un contrat. */
export interface Attribution {
  readonly id: string;
  readonly contractId: string;
  readonly sectorId: string;
  readonly lot: number;
}
export type AttributionInput = Omit<Attribution, 'id'>;

/** Exercice annuel d'un contrat, rattaché à un secteur. */
export interface Exercise {
  readonly id: string;
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
  readonly active: boolean;
}
export type UserInput = Omit<User, 'id'>;
