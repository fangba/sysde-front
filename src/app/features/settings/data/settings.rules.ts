import { periodsOverlap, yearOf } from '@shared/util/dates';

import { FREQUENCY_PERIODS, FREQUENCY_UNITS, POSTES_BY_OPERATOR_TYPE } from './settings.constants';
import type {
  Activity,
  Attribution,
  Contract,
  Exercise,
  FrequencyPeriod,
  Lot,
  Operator,
  OperatorType,
  Poste,
  Section,
  Sector,
  User,
} from './settings.models';

/** Règles métier du cahier des charges, sans dépendance à Angular (donc faciles à tester). */

export type ContractStatus = 'upcoming' | 'active' | 'ended';

export function contractStatus(
  contract: Pick<Contract, 'startDate' | 'endDate'>,
  today: string,
): ContractStatus {
  if (today < contract.startDate) {
    return 'upcoming';
  }
  return today > contract.endDate ? 'ended' : 'active';
}

/** Un opérateur ne peut avoir deux contrats qui se chevauchent. */
export function findContractConflict(
  candidate: Pick<Contract, 'operatorId' | 'startDate' | 'endDate'>,
  contracts: readonly Contract[],
  ignoreId?: string,
): Contract | undefined {
  return contracts.find(
    (c) =>
      c.id !== ignoreId &&
      c.operatorId === candidate.operatorId &&
      periodsOverlap(c.startDate, c.endDate, candidate.startDate, candidate.endDate),
  );
}

/**
 * Un lot ne peut être affecté qu'à un seul opérateur au cours d'un même contrat :
 * on refuse donc une attribution si le même lot l'est déjà dans un contrat dont la période
 * chevauche celle du contrat visé (y compris ce contrat lui-même).
 */
export function findLotConflict(
  candidate: Pick<Attribution, 'contractId' | 'sectorId'> & { readonly lot: number },
  attributions: readonly Attribution[],
  contracts: readonly Contract[],
  ignoreId?: string,
): Attribution | undefined {
  const target = contracts.find((c) => c.id === candidate.contractId);
  if (!target) {
    return undefined;
  }
  return attributions.find((a) => {
    if (a.id === ignoreId || a.sectorId !== candidate.sectorId || !a.lots.includes(candidate.lot)) {
      return false;
    }
    const other = contracts.find((c) => c.id === a.contractId);
    return (
      !!other && periodsOverlap(other.startDate, other.endDate, target.startDate, target.endDate)
    );
  });
}

/** Une seule attribution par couple contrat / secteur : on la modifie pour y ajouter des lots. */
export function findAttributionDuplicate(
  candidate: Pick<Attribution, 'contractId' | 'sectorId'>,
  attributions: readonly Attribution[],
  ignoreId?: string,
): Attribution | undefined {
  return attributions.find(
    (a) =>
      a.id !== ignoreId &&
      a.contractId === candidate.contractId &&
      a.sectorId === candidate.sectorId,
  );
}

/** « Lot 1 » ou « Lots 1, 2 ». */
export function lotsLabel(lots: readonly number[]): string {
  const sorted = [...lots].sort((a, b) => a - b);
  return `${sorted.length > 1 ? 'Lots' : 'Lot'} ${sorted.join(', ')}`;
}

export function findExerciseDuplicate(
  candidate: Pick<Exercise, 'attributionId' | 'year'>,
  exercises: readonly Exercise[],
  ignoreId?: string,
): Exercise | undefined {
  return exercises.find(
    (e) =>
      e.id !== ignoreId && e.attributionId === candidate.attributionId && e.year === candidate.year,
  );
}

/** Secteurs sur lesquels un contrat porte (au moins un lot attribué). */
export function sectorIdsOfContract(
  contractId: string,
  attributions: readonly Attribution[],
): readonly string[] {
  return [
    ...new Set(attributions.filter((a) => a.contractId === contractId).map((a) => a.sectorId)),
  ];
}

/** Années civiles couvertes par un contrat (un exercice par année). */
export function contractYears(
  contract: Pick<Contract, 'startDate' | 'endDate'>,
): readonly number[] {
  const first = yearOf(contract.startDate);
  const last = yearOf(contract.endDate);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** Postes proposés pour une organisation ; conserve le poste déjà occupé lors d'une modification. */
export function allowedPostes(type: OperatorType, current?: Poste): readonly Poste[] {
  const base = POSTES_BY_OPERATOR_TYPE[type];
  return current && !base.includes(current) ? [...base, current] : base;
}

/** Lots d'un secteur confiés à un opérateur, par l'un quelconque de ses contrats. */
export function lotsOfOperatorInSector(
  operatorId: string,
  sectorId: string,
  contracts: readonly Contract[],
  attributions: readonly Attribution[],
): readonly number[] {
  const contractIds = new Set(
    contracts.filter((c) => c.operatorId === operatorId).map((c) => c.id),
  );
  const lots = attributions
    .filter((a) => a.sectorId === sectorId && contractIds.has(a.contractId))
    .flatMap((a) => a.lots);
  return [...new Set(lots)].sort((a, b) => a - b);
}

export function findMatriculeConflict(
  matricule: string,
  users: readonly User[],
  ignoreId?: string,
): User | undefined {
  const wanted = matricule.trim().toUpperCase();
  return users.find((u) => u.id !== ignoreId && u.matricule?.trim().toUpperCase() === wanted);
}

export function findEmailConflict(
  email: string,
  users: readonly User[],
  ignoreId?: string,
): User | undefined {
  const wanted = email.trim().toLowerCase();
  return users.find((u) => u.id !== ignoreId && u.email.trim().toLowerCase() === wanted);
}

export function findOperatorAcronymConflict(
  acronym: string,
  operators: readonly Operator[],
  ignoreId?: string,
): Operator | undefined {
  const wanted = acronym.trim().toUpperCase();
  return operators.find((o) => o.id !== ignoreId && o.acronym.toUpperCase() === wanted);
}

/** Secteurs attribués à un opérateur, par l'un quelconque de ses contrats. */
export function sectorsOfOperator(
  operatorId: string,
  contracts: readonly Contract[],
  attributions: readonly Attribution[],
  sectors: readonly Sector[],
): readonly Sector[] {
  const contractIds = new Set(
    contracts.filter((c) => c.operatorId === operatorId).map((c) => c.id),
  );
  const sectorIds = new Set(
    attributions.filter((a) => contractIds.has(a.contractId)).map((a) => a.sectorId),
  );
  return sectors.filter((s) => sectorIds.has(s.id));
}

export function findSectorCodeConflict(
  code: string,
  sectors: readonly Sector[],
  ignoreId?: string,
): Sector | undefined {
  const wanted = code.trim().toUpperCase();
  return sectors.find((s) => s.id !== ignoreId && s.code.toUpperCase() === wanted);
}

/** Un numéro de lot est unique au sein d'un secteur. */
export function findLotNumberConflict(
  candidate: Pick<Lot, 'sectorId' | 'number'>,
  lots: readonly Lot[],
  ignoreId?: string,
): Lot | undefined {
  return lots.find(
    (l) => l.id !== ignoreId && l.sectorId === candidate.sectorId && l.number === candidate.number,
  );
}

/** Le nom d'une section est unique au sein d'un lot (sans tenir compte de la casse ni des accents). */
export function findSectionNameConflict(
  candidate: Pick<Section, 'lotId' | 'name'>,
  sections: readonly Section[],
  ignoreId?: string,
): Section | undefined {
  const wanted = normalizeLabel(candidate.name);
  return sections.find(
    (s) => s.id !== ignoreId && s.lotId === candidate.lotId && normalizeLabel(s.name) === wanted,
  );
}

function normalizeLabel(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Le libellé d'une activité est unique pour un poste, toutes catégories confondues. */
export function findActivityConflict(
  candidate: Pick<Activity, 'poste' | 'label'>,
  activities: readonly Activity[],
  ignoreId?: string,
): Activity | undefined {
  const wanted = normalizeLabel(candidate.label);
  return activities.find(
    (a) => a.id !== ignoreId && a.poste === candidate.poste && normalizeLabel(a.label) === wanted,
  );
}

export const periodInfo = (period: FrequencyPeriod) =>
  FREQUENCY_PERIODS.find((p) => p.code === period) ?? FREQUENCY_PERIODS[0]!;

/** « 4 par an », « 3 par an et par plantation » ; « Non définie » sans fréquence. */
export function frequencyLabel(activity: Pick<Activity, 'frequency'>): string {
  const f = activity.frequency;
  if (!f) {
    return 'Non définie';
  }
  const unit = f.unit ? FREQUENCY_UNITS.find((u) => u.code === f.unit)?.label.toLowerCase() : null;
  return `${f.count} par ${periodInfo(f.period).word}${unit ? ` et par ${unit}` : ''}`;
}
