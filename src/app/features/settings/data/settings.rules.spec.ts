import { describe, expect, it } from 'vitest';

import type { Group, User } from './settings.models';

import {
  DEMO_ACTIVITIES,
  DEMO_ATTRIBUTIONS,
  DEMO_CONTRACTS,
  DEMO_EXERCISES,
  DEMO_LOTS,
  DEMO_OPERATORS,
  DEMO_SECTORS,
  DEMO_USERS,
} from './settings.demo';
import {
  allowedPostes,
  contractStatus,
  contractYears,
  findActivityConflict,
  findContractConflict,
  findEmailConflict,
  findExerciseDuplicate,
  findGroupNameConflict,
  findLotConflict,
  findLotNumberConflict,
  findMatriculeConflict,
  lotsOfOperatorInSector,
  monitorsOf,
  findSectorCodeConflict,
  findOperatorAcronymConflict,
  findSectionNameConflict,
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
    expect(findLotConflict(free, DEMO_ATTRIBUTIONS, DEMO_CONTRACTS, 'at-2')).toBeUndefined();
  });

  it('autorise un même lot sur des contrats successifs', () => {
    // ct-4 (2023-2025) et ct-5 (2026-2028) portent tous deux sur le secteur sec-3.
    const next = { contractId: 'ct-5', sectorId: 'sec-3', lot: 1 };
    expect(findLotConflict(next, DEMO_ATTRIBUTIONS, DEMO_CONTRACTS, 'at-5')).toBeUndefined();
  });

  it('détecte un exercice en double', () => {
    expect(findExerciseDuplicate({ attributionId: 'at-1', year: 2025 }, DEMO_EXERCISES)?.id).toBe(
      'ex-2',
    );
    expect(
      findExerciseDuplicate({ attributionId: 'at-1', year: 2025 }, DEMO_EXERCISES, 'ex-2'),
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

  it('refuse un code de secteur ou un numéro de lot déjà utilisé', () => {
    expect(findSectorCodeConflict(' s01 ', DEMO_SECTORS)?.id).toBe('sec-1');
    expect(findSectorCodeConflict('S01', DEMO_SECTORS, 'sec-1')).toBeUndefined();
    expect(findLotNumberConflict({ sectorId: 'sec-1', number: 2 }, DEMO_LOTS)?.number).toBe(2);
    expect(findLotNumberConflict({ sectorId: 'sec-1', number: 4 }, DEMO_LOTS)).toBeUndefined();
  });
});

describe('activités des plannings', () => {
  const byPoste = (poste: string, category: string) =>
    DEMO_ACTIVITIES.filter((a) => a.poste === poste && a.category === category).map((a) => a.label);

  it('reprend le référentiel de chaque poste, catégorie par catégorie', () => {
    expect(byPoste('CF', 'FORMATION')).toEqual([
      'Formation à la saignée',
      'Suivi post perfectionnement',
      'Recyclage des saigneurs',
      'Perfectionnement in situ',
    ]);
    expect(byPoste('CF', 'VISITE')).toEqual([]);
    expect(byPoste('CO', 'VISITE')).toEqual(['Visite de plantation', 'Visite de conformité']);
    expect(byPoste('FS', 'FORMATION')).toEqual(['Formation à la saignée']);
    expect(byPoste('MO', 'FORMATION')).toEqual(['Perfectionnement in situ']);
    expect(byPoste('MO', 'VISITE')).toEqual(['Visite de plantation', 'Découverte de verger']);
    expect(byPoste('ES', 'VISITE')).toEqual(["Visite d'intervention"]);
    expect(byPoste('MO', 'RENCONTRE')).toEqual(['Groupe de vulgarisation']);
    expect(byPoste('ES', 'RENCONTRE')).toEqual([]);
    expect(byPoste('CS', 'VISITE')).toEqual(['Visite de plantation']);
    expect(byPoste('CS', 'RENCONTRE')).toEqual(['Conférence thématique', "Voyage d'étude"]);
    expect(DEMO_ACTIVITIES.some((a) => a.category === 'RENCONTRE' && a.poste === 'CO')).toBe(false);
  });

  it('refuse un libellé déjà pris pour le même poste, mais pas pour un autre poste', () => {
    const co = { poste: 'CO' as const, label: '  VISITE de plantation ' };
    expect(findActivityConflict(co, DEMO_ACTIVITIES)?.id).toBe('ac-7');
    expect(findActivityConflict(co, DEMO_ACTIVITIES, 'ac-7')).toBeUndefined();
    expect(
      findActivityConflict({ poste: 'FS', label: 'Visite de plantation' }, DEMO_ACTIVITIES),
    ).toBeUndefined();
  });
});

describe('matricule, lot et section des collaborateurs', () => {
  it('liste les lots d’un secteur confiés à un opérateur', () => {
    expect(lotsOfOperatorInSector('op-3', 'sec-1', DEMO_CONTRACTS, DEMO_ATTRIBUTIONS)).toEqual([
      1, 2,
    ]);
    expect(lotsOfOperatorInSector('op-3', 'sec-4', DEMO_CONTRACTS, DEMO_ATTRIBUTIONS)).toEqual([]);
  });

  it('détecte un matricule déjà attribué, sans tenir compte de la casse', () => {
    const owner = DEMO_USERS.find((u) => u.matricule);
    expect(owner).toBeDefined();
    const matricule = owner?.matricule?.toLowerCase() ?? '';
    expect(findMatriculeConflict(matricule, DEMO_USERS)?.id).toBe(owner?.id);
    expect(findMatriculeConflict(matricule, DEMO_USERS, owner?.id)).toBeUndefined();
  });
});

describe('findSectionNameConflict', () => {
  const sections = [
    { id: 's1', lotId: 'lot-1', name: 'Section Nord', description: '' },
    { id: 's2', lotId: 'lot-2', name: 'A', description: '' },
  ];

  it('refuse un nom déjà pris dans le même lot, sans tenir compte de la casse ni des espaces', () => {
    expect(findSectionNameConflict({ lotId: 'lot-1', name: ' section  nord ' }, sections)?.id).toBe(
      's1',
    );
  });

  it('accepte le même nom dans un autre lot ou pour la section modifiée', () => {
    expect(findSectionNameConflict({ lotId: 'lot-3', name: 'A' }, sections)).toBeUndefined();
    expect(
      findSectionNameConflict({ lotId: 'lot-1', name: 'Section Nord' }, sections, 's1'),
    ).toBeUndefined();
  });
});

describe('groupes de vulgarisation', () => {
  const group = (over: Partial<Group>): Group => ({
    id: 'g1',
    lotId: 'l1',
    sectionId: 's1',
    name: 'Kouassikro',
    village: '',
    delegate: '',
    monitorId: 'u1',
    ...over,
  });

  it('refuse un nom déjà pris dans la même section, sans tenir compte de la casse ni des accents', () => {
    const groups = [group({})];
    expect(findGroupNameConflict({ sectionId: 's1', name: ' KOUASSIKRO ' }, groups)?.id).toBe('g1');
    expect(findGroupNameConflict({ sectionId: 's2', name: 'Kouassikro' }, groups)).toBeUndefined();
    expect(
      findGroupNameConflict({ sectionId: 's1', name: 'Kouassikro' }, groups, 'g1'),
    ).toBeUndefined();
  });

  it('ne propose que les moniteurs actifs de l’opérateur dans le secteur', () => {
    const u = (id: string, over: Partial<User>): User => ({
      id,
      lastName: id,
      firstName: 'X',
      email: '',
      phone: '',
      operatorId: 'op-3',
      poste: 'MO',
      sectorId: 'sec-1',
      active: true,
      ...over,
    });
    const users = [
      u('b', {}),
      u('a', {}),
      u('inactif', { active: false }),
      u('autre-secteur', { sectorId: 'sec-2' }),
      u('autre-operateur', { operatorId: 'op-4' }),
      u('pas-moniteur', { poste: 'CF' }),
    ];
    expect(monitorsOf(users, 'sec-1', 'op-3').map((m) => m.id)).toEqual(['a', 'b']);
  });
});
