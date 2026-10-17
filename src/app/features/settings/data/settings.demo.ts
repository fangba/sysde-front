import type {
  Attribution,
  Contract,
  Exercise,
  Lot,
  Operator,
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

export const DEMO_USERS: readonly User[] = [
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
  user(14, 'Aka', 'Jean', 'op-3', 'FO', 'sec-1'),
  user(15, 'Yéo', 'Salimata', 'op-3', 'SE'),
  user(16, 'Tano', 'Koffi', 'op-5', 'MO', 'sec-2'),
  user(17, 'Zadi', 'Rose', 'op-4', 'CO', 'sec-5'),
  // Comptes de connexion de démonstration (voir features/auth/data/demo-accounts.ts).
  { ...user(18, 'Bamba', 'Seydou', 'op-2', 'DI'), email: 'admin.firca@sysde.ci' },
  { ...user(19, 'Kouamé', 'Yves', 'op-1', 'DI'), email: 'admin.apromac@sysde.ci' },
  { ...user(20, 'Konaté', 'Mamadou', 'op-3', 'CD'), email: 'chef.departement@sysde.ci' },
  { ...user(21, 'Brou', 'Clarisse', 'op-3', 'CS', 'sec-1'), email: 'chef.secteur@sysde.ci' },
  { ...user(22, 'Gbané', 'Jules', 'op-1', 'SU'), email: 'superviseur@sysde.ci' },
];
