import type {
  Activity,
  ActivityCategory,
  ActivityFrequency,
  FrequencyPeriod,
  FrequencyUnit,
  Attribution,
  Contract,
  Exercise,
  Lot,
  Operator,
  PlanningPoste,
  Sector,
  User,
} from './settings.models';

const operator = (id: string, acronym: string, name: string, type: Operator['type']): Operator => ({
  id,
  acronym,
  name,
  type,
  email: `contact@${acronym.toLowerCase()}.ci`,
  phone: '',
  active: true,
});

export const DEMO_OPERATORS: readonly Operator[] = [
  operator(
    'op-1',
    'APROMAC',
    'Association professionnelle des producteurs de caoutchouc naturel',
    'ORGANISME',
  ),
  operator(
    'op-2',
    'FIRCA',
    'Fonds interprofessionnel pour la recherche et le conseil agricoles',
    'ORGANISME',
  ),
  operator('op-3', 'SAPH', 'Société africaine de plantations d’hévéas', 'TECHNIQUE'),
  operator('op-4', 'SOGB', 'Société des caoutchoucs de Grand-Béréby', 'TECHNIQUE'),
  operator('op-5', 'TRCI', 'Tropical Rubber Côte d’Ivoire', 'TECHNIQUE'),
  operator('op-6', 'EXAT', 'Exploitation agricole Téhui', 'TECHNIQUE'),
  operator('op-7', 'CCP', 'Compagnie des caoutchoucs du Pakidié', 'TECHNIQUE'),
  operator('op-8', 'IDH', 'L’Ivoirienne d’hévéa', 'TECHNIQUE'),
  operator('op-9', 'CHC', 'Compagnie hévéicole de Cavally', 'TECHNIQUE'),
];

export const DEMO_SECTORS: readonly Sector[] = [
  { id: 'sec-1', code: 'S01', name: 'Aboisso' },
  { id: 'sec-2', code: 'S02', name: 'Adiaké' },
  { id: 'sec-3', code: 'S03', name: 'Soubré' },
  { id: 'sec-4', code: 'S04', name: 'Gagnoa' },
  { id: 'sec-5', code: 'S05', name: 'Grand-Béréby' },
  { id: 'sec-6', code: 'S06', name: 'Dabou' },
];

export const DEMO_LOTS: readonly Lot[] = DEMO_SECTORS.flatMap((sector, s) =>
  [1, 2, 3].map((number) => ({
    id: `lot-${s * 3 + number}`,
    sectorId: sector.id,
    number,
    description: '',
  })),
);

export const DEMO_CONTRACTS: readonly Contract[] = [
  {
    id: 'ct-1',
    reference: 'CT-SAPH-2024',
    operatorId: 'op-3',
    startDate: '2024-01-01',
    endDate: '2026-12-31',
  },
  {
    id: 'ct-2',
    reference: 'CT-SOGB-2024',
    operatorId: 'op-4',
    startDate: '2024-01-01',
    endDate: '2026-12-31',
  },
  {
    id: 'ct-3',
    reference: 'CT-TRCI-2025',
    operatorId: 'op-5',
    startDate: '2025-01-01',
    endDate: '2027-12-31',
  },
  {
    id: 'ct-4',
    reference: 'CT-EXAT-2023',
    operatorId: 'op-6',
    startDate: '2023-01-01',
    endDate: '2025-12-31',
  },
  {
    id: 'ct-5',
    reference: 'CT-CCP-2026',
    operatorId: 'op-7',
    startDate: '2026-01-01',
    endDate: '2028-12-31',
  },
  {
    id: 'ct-6',
    reference: 'CT-IDH-2024',
    operatorId: 'op-8',
    startDate: '2024-07-01',
    endDate: '2027-06-30',
  },
  {
    id: 'ct-7',
    reference: 'CT-CHC-2024',
    operatorId: 'op-9',
    startDate: '2024-01-01',
    endDate: '2026-12-31',
  },
];

export const DEMO_ATTRIBUTIONS: readonly Attribution[] = [
  { id: 'at-1', contractId: 'ct-1', sectorId: 'sec-1', lots: [1, 2] },
  { id: 'at-2', contractId: 'ct-2', sectorId: 'sec-1', lots: [3] },
  { id: 'at-3', contractId: 'ct-3', sectorId: 'sec-2', lots: [1, 2, 3] },
  { id: 'at-4', contractId: 'ct-4', sectorId: 'sec-3', lots: [1, 2, 3] },
  { id: 'at-5', contractId: 'ct-5', sectorId: 'sec-3', lots: [1, 2, 3] },
  { id: 'at-6', contractId: 'ct-6', sectorId: 'sec-4', lots: [1, 2] },
  { id: 'at-7', contractId: 'ct-7', sectorId: 'sec-4', lots: [3] },
  { id: 'at-8', contractId: 'ct-2', sectorId: 'sec-5', lots: [1, 2, 3] },
];

export const DEMO_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-1',
    attributionId: 'at-1',
    contractId: 'ct-1',
    sectorId: 'sec-1',
    year: 2024,
    closingDate: '2024-12-31',
  },
  {
    id: 'ex-2',
    attributionId: 'at-1',
    contractId: 'ct-1',
    sectorId: 'sec-1',
    year: 2025,
    closingDate: '2025-12-31',
  },
  {
    id: 'ex-3',
    attributionId: 'at-1',
    contractId: 'ct-1',
    sectorId: 'sec-1',
    year: 2026,
    closingDate: '2026-12-31',
  },
  {
    id: 'ex-4',
    attributionId: 'at-16',
    contractId: 'ct-2',
    sectorId: 'sec-5',
    year: 2025,
    closingDate: '2025-12-31',
  },
  {
    id: 'ex-5',
    attributionId: 'at-4',
    contractId: 'ct-3',
    sectorId: 'sec-2',
    year: 2026,
    closingDate: '2026-12-31',
  },
  {
    id: 'ex-6',
    attributionId: 'at-10',
    contractId: 'ct-5',
    sectorId: 'sec-3',
    year: 2026,
    closingDate: '2026-12-31',
  },
];

const user = (
  n: number,
  lastName: string,
  firstName: string,
  operatorId: string,
  poste: User['poste'],
  sectorId?: string,
): User => ({
  id: `us-${n}`,
  lastName,
  firstName,
  email:
    `${firstName}.${lastName}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z.]/g, '') + '@sysde.ci',
  phone: '',
  operatorId,
  poste,
  ...(sectorId ? { sectorId } : {}),
  active: true,
});

const DEMO_USERS_BASE: readonly User[] = [
  user(1, 'Koné', 'Mariam', 'op-2', 'DI'),
  user(2, 'Yao', 'Konan', 'op-2', 'SU'),
  user(3, 'Diabaté', 'Salif', 'op-1', 'SU'),
  user(4, 'Traoré', 'Ibrahim', 'op-3', 'CD'),
  user(5, "N'Guessan", 'Paul', 'op-4', 'CD'),
  user(6, 'Kouassi', 'Anne', 'op-5', 'CD'),
  user(7, 'Bamba', 'Awa', 'op-7', 'CD'),
  { ...user(8, 'Ouattara', 'Fatou', 'op-8', 'CD'), active: false },
  user(9, 'Coulibaly', 'Adama', 'op-1', 'DI'),
  user(10, 'Soro', 'Adama', 'op-3', 'CS', 'sec-1'),
  user(11, 'Kouadio', 'Marie', 'op-4', 'CS', 'sec-5'),
  user(12, 'Dosso', 'Lanciné', 'op-5', 'CS', 'sec-2'),
  user(13, 'Gnahoré', 'Eric', 'op-7', 'CS', 'sec-3'),
  { ...user(14, 'Aka', 'Jean', 'op-3', 'FS', 'sec-1'), email: 'formateur@sysde.ci' },
  user(15, 'Yéo', 'Salimata', 'op-3', 'SE'),
  user(16, 'Tano', 'Koffi', 'op-5', 'MO', 'sec-2'),
  user(17, 'Zadi', 'Rose', 'op-4', 'CO', 'sec-5'),
  // Comptes de connexion de démonstration (voir features/auth/data/demo-accounts.ts).
  { ...user(18, 'Bamba', 'Seydou', 'op-2', 'DI'), email: 'admin.firca@sysde.ci' },
  { ...user(19, 'Kouamé', 'Yves', 'op-1', 'DI'), email: 'admin.apromac@sysde.ci' },
  { ...user(20, 'Konaté', 'Mamadou', 'op-3', 'CD'), email: 'chef.departement@sysde.ci' },
  { ...user(21, 'Brou', 'Clarisse', 'op-3', 'CS', 'sec-1'), email: 'chef.secteur@sysde.ci' },
  { ...user(23, 'Kra', 'Estelle', 'op-3', 'CF', 'sec-1'), email: 'collaborateur@sysde.ci' },
  {
    ...user(24, 'Diomandé', 'Issouf', 'op-3', 'CO', 'sec-1'),
    email: 'controleur.ordinaire@sysde.ci',
  },
  { ...user(25, 'Ouédraogo', 'Brice', 'op-3', 'MO', 'sec-1'), email: 'moniteur@sysde.ci' },
  { ...user(26, 'Sanogo', 'Fanta', 'op-3', 'ES', 'sec-1'), email: 'equipe.speciale@sysde.ci' },
  { ...user(27, 'Ahou', 'Carine', 'op-3', 'SE', 'sec-1'), email: 'secretaire@sysde.ci' },
  { ...user(22, 'Gbané', 'Jules', 'op-1', 'SU'), email: 'superviseur@sysde.ci' },
];

let activityCounter = 0;
/** Activité du référentiel : libellé seul, ou libellé, objectif annuel et durée en jours. */
type ActivitySeed =
  | string
  | readonly [label: string, frequency: ActivityFrequency | null, days: number, active?: boolean];

/** Fréquence : `count` séances par période, pour chaque `unit` quand il est donné. */
const every = (
  count: number,
  period: FrequencyPeriod,
  unit: FrequencyUnit | null = null,
): ActivityFrequency => ({ count, period, unit });
const activities = (
  poste: PlanningPoste,
  category: ActivityCategory,
  seeds: readonly ActivitySeed[],
): Activity[] =>
  seeds.map((seed) => {
    activityCounter += 1;
    const [label, frequency, durationDays, active = true] =
      typeof seed === 'string' ? [seed, null, 1] : seed;
    return {
      id: `ac-${activityCounter}`,
      poste,
      category,
      label,
      active,
      frequency,
      durationDays,
    };
  });

/** Activités de planning de chaque poste (catégories sans activité : aucune ligne). */
export const DEMO_ACTIVITIES: readonly Activity[] = [
  ...activities('CS', 'VISITE', [['Visite de plantation', every(3, 'YEAR', 'PLANTATION'), 1]]),
  ...activities('CS', 'RENCONTRE', [
    ['Conférence thématique', every(4, 'YEAR'), 1],
    ["Voyage d'étude", every(4, 'YEAR'), 1],
  ]),
  ...activities('CF', 'FORMATION', [
    ['Formation à la saignée', every(1, 'SEMESTER'), 20],
    ['Suivi post perfectionnement', every(1, 'MONTH', 'SAIGNEUR'), 1],
    ['Recyclage des saigneurs', every(1, 'YEAR'), 3],
  ]),
  ...activities('CO', 'VISITE', [
    ['Visite de plantation', every(3, 'YEAR', 'PLANTATION'), 1],
    ['Visite de conformité', every(1, 'MONTH', 'MONITEUR'), 1],
  ]),
  ...activities('FS', 'FORMATION', [['Formation à la saignée', every(1, 'MONTH'), 20]]),
  ...activities('MO', 'FORMATION', [
    ['Perfectionnement in situ', every(1, 'MONTH', 'SAIGNEUR'), 1],
  ]),
  ...activities('MO', 'VISITE', [
    ['Visite de plantation', every(4, 'YEAR', 'PLANTATION'), 1],
    ['Découverte de verger', null, 1],
  ]),
  ...activities('MO', 'RENCONTRE', [['Groupe de vulgarisation', every(4, 'YEAR', 'GROUPE'), 1]]),
  ...activities('ES', 'VISITE', [["Visite d'intervention", every(2, 'YEAR', 'PLANTATION'), 1]]),
  ...activities('CF', 'FORMATION', [
    ['Perfectionnement in situ', every(1, 'MONTH', 'SAIGNEUR'), 1],
  ]),
];

/** Matricule, lot et section de démonstration des collaborateurs (numéro de compte → affectation). */
const COLLABORATOR_ASSIGNMENT: Readonly<
  Record<number, { readonly lot?: number; readonly section?: string }>
> = {
  14: { lot: 1 },
  15: {},
  16: { lot: 1, section: 'A' },
  17: { lot: 2, section: 'B' },
  23: { lot: 1 },
  24: { lot: 1, section: 'A, B' },
  25: { lot: 1, section: 'B' },
  26: {},
  27: {},
};

export const DEMO_USERS: readonly User[] = DEMO_USERS_BASE.map((u) => {
  const n = Number(u.id.slice(3));
  const acronym = DEMO_OPERATORS.find((o) => o.id === u.operatorId)?.acronym;
  return {
    ...u,
    ...(acronym ? { matricule: `${acronym}-${String(300 + n * 7).padStart(5, '0')}` } : {}),
    ...COLLABORATOR_ASSIGNMENT[n],
  };
});
