import { periodsOverlap, yearOf } from '@shared/util/dates';

import { POSTES_BY_OPERATOR_TYPE } from './settings.constants';
import type {
  Attribution,
  Contract,
  Exercise,
  Operator,
  OperatorType,
  Poste,
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
  candidate: Pick<Attribution, 'contractId' | 'sectorId' | 'lot'>,
  attributions: readonly Attribution[],
  contracts: readonly Contract[],
  ignoreId?: string,
): Attribution | undefined {
  const target = contracts.find((c) => c.id === candidate.contractId);
  if (!target) {
    return undefined;
  }
  return attributions.find((a) => {
    if (a.id === ignoreId || a.sectorId !== candidate.sectorId || a.lot !== candidate.lot) {
      return false;
    }
    const other = contracts.find((c) => c.id === a.contractId);
    return (
      !!other && periodsOverlap(other.startDate, other.endDate, target.startDate, target.endDate)
    );
  });
}

export function findExerciseDuplicate(
  candidate: Pick<Exercise, 'contractId' | 'sectorId' | 'year'>,
  exercises: readonly Exercise[],
  ignoreId?: string,
): Exercise | undefined {
  return exercises.find(
    (e) =>
      e.id !== ignoreId &&
      e.contractId === candidate.contractId &&
      e.sectorId === candidate.sectorId &&
      e.year === candidate.year,
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
