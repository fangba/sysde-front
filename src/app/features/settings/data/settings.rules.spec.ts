import { describe, expect, it } from 'vitest';

import {
  DEMO_ATTRIBUTIONS,
  DEMO_CONTRACTS,
  DEMO_EXERCISES,
  DEMO_OPERATORS,
  DEMO_SECTORS,
  DEMO_USERS,
} from './settings.demo';
import {
  allowedPostes,
  contractStatus,
  contractYears,
  findContractConflict,
  findEmailConflict,
  findExerciseDuplicate,
  findLotConflict,
  findOperatorAcronymConflict,
  sectorIdsOfContract,
  sectorsOfOperator,
} from './settings.rules';

describe('settings.rules', () => {
  it('calcule le statut d’un contrat', () => {
    const c = { startDate: '2024-01-01', endDate: '2026-12-31' };
    expect(contractStatus(c, '2023-12-31')).toBe('upcoming');
    expect(contractStatus(c, '2024-01-01')).toBe('active');
    expect(contractStatus(c, '2026-12-31')).toBe('active');
    expect(contractStatus(c, '2027-01-01')).toBe('ended');
  });

  it('détecte le chevauchement de contrats d’un même opérateur', () => {
    const overlapping = { operatorId: 'op-3', startDate: '2026-06-01', endDate: '2029-05-31' };
    expect(findContractConflict(overlapping, DEMO_CONTRACTS)?.id).toBe('ct-1');
    expect(findContractConflict(overlapping, DEMO_CONTRACTS, 'ct-1')).toBeUndefined();
    expect(
      findContractConflict(
        { ...overlapping, startDate: '2027-01-01', endDate: '2029-12-31' },
        DEMO_CONTRACTS,
      ),
    ).toBeUndefined();
    expect(findContractConflict({ ...overlapping, operatorId: 'op-9' }, DEMO_CONTRACTS)?.id).toBe(
      'ct-7',
    );
  });

  it('refuse un lot déjà attribué sur une période qui se chevauche', () => {
    const taken = { contractId: 'ct-2', sectorId: 'sec-1', lot: 1 };
    expect(findLotConflict(taken, DEMO_ATTRIBUTIONS, DEMO_CONTRACTS)?.contractId).toBe('ct-1');
    const free = { contractId: 'ct-2', sectorId: 'sec-1', lot: 3 };
    expect(findLotConflict(free, DEMO_ATTRIBUTIONS, DEMO_CONTRACTS, 'at-3')).toBeUndefined();
  });

  it('autorise un même lot sur des contrats successifs', () => {
    // ct-4 (2023-2025) et ct-5 (2026-2028) portent tous deux sur le secteur sec-3.
    const next = { contractId: 'ct-5', sectorId: 'sec-3', lot: 1 };
    expect(findLotConflict(next, DEMO_ATTRIBUTIONS, DEMO_CONTRACTS, 'at-10')).toBeUndefined();
  });

  it('détecte un exercice en double', () => {
    expect(
      findExerciseDuplicate({ contractId: 'ct-1', sectorId: 'sec-1', year: 2025 }, DEMO_EXERCISES)
        ?.id,
    ).toBe('ex-2');
    expect(
      findExerciseDuplicate(
        { contractId: 'ct-1', sectorId: 'sec-1', year: 2025 },
        DEMO_EXERCISES,
        'ex-2',
      ),
    ).toBeUndefined();
  });

  it('liste les secteurs et années d’un contrat', () => {
    expect(sectorIdsOfContract('ct-2', DEMO_ATTRIBUTIONS)).toEqual(['sec-1', 'sec-5']);
    expect(contractYears({ startDate: '2024-07-01', endDate: '2027-06-30' })).toEqual([
      2024, 2025, 2026, 2027,
    ]);
    expect(contractYears({ startDate: '2024-01-01', endDate: '2026-12-31' })).toEqual([
      2024, 2025, 2026,
    ]);
  });

  it('limite les postes selon l’organisation', () => {
    expect(allowedPostes('TECHNIQUE')).toEqual(['CD']);
    expect(allowedPostes('ORGANISME')).toEqual(['DI', 'SU']);
    expect(allowedPostes('TECHNIQUE', 'CS')).toEqual(['CD', 'CS']);
  });

  it('détecte les doublons d’acronyme et d’e-mail sans tenir compte de la casse', () => {
    expect(findOperatorAcronymConflict(' saph ', DEMO_OPERATORS)?.id).toBe('op-3');
    expect(findOperatorAcronymConflict('SAPH', DEMO_OPERATORS, 'op-3')).toBeUndefined();
    const email = DEMO_USERS[0].email.toUpperCase();
    expect(findEmailConflict(email, DEMO_USERS)?.id).toBe(DEMO_USERS[0].id);
    expect(findEmailConflict(email, DEMO_USERS, DEMO_USERS[0].id)).toBeUndefined();
  });

  it('liste les secteurs attribués à un opérateur', () => {
    const codes = (operatorId: string) =>
      sectorsOfOperator(operatorId, DEMO_CONTRACTS, DEMO_ATTRIBUTIONS, DEMO_SECTORS).map(
        (s) => s.code,
      );
    expect(codes('op-4')).toEqual(['S01', 'S05']);
    expect(codes('op-3')).toEqual(['S01']);
    expect(codes('op-1')).toEqual([]);
  });

  it('place chaque compte de démonstration au poste de son type d’organisation', () => {
    for (const user of DEMO_USERS) {
      const operator = DEMO_OPERATORS.find((o) => o.id === user.operatorId);
      expect(operator, user.email).toBeDefined();
      if (operator?.type === 'ORGANISME') {
        expect(['DI', 'SU']).toContain(user.poste);
      }
    }
  });
});
