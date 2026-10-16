/** Périmètre d'un tableau de bord : détermine les données et les libellés affichés. */
export type DashboardProfileId = 'organisme' | 'operateur' | 'secteur' | 'supervision';

/** Périmètre envoyé au back (`GET /dashboard?profile=…&operator=…&sector=…`). */
export interface DashboardScope {
  readonly profile: DashboardProfileId;
  /** Sigle de l'opérateur de l'utilisateur. */
  readonly operator: string;
  /** Code du secteur, pour un chef de secteur. */
  readonly sector?: string;
  /** Administrateur : opérateur sélectionné dans la liste, absent pour « tous ». */
  readonly filterOperator?: string;
  /** Chef de département : secteur sélectionné dans la liste, absent pour « tous ». */
  readonly filterSector?: string;
}

/** Opérateurs techniques proposés à l'administrateur pour filtrer le dashboard. */
export const FILTER_OPERATORS: readonly string[] = [
  'SAPH',
  'SOGB',
  'TRCI',
  'EXAT',
  'CCP',
  'IDH',
  'CHC',
];
export const ALL_OPERATORS = 'ALL';
export const ALL_SECTORS = 'ALL';

export interface DashboardProfile {
  readonly id: DashboardProfileId;
  readonly title: string;
  readonly subtitle: string;
  readonly kpi: {
    readonly production: string;
    readonly planters: string;
    readonly hectares: string;
    readonly visits: string;
  };
  readonly chartHeading: string;
  readonly chartSubheading: string;
  readonly visitsHeading: string;
  readonly deadlinesSubheading: string;
}

export const DASHBOARD_PROFILES: Readonly<Record<DashboardProfileId, DashboardProfile>> = {
  organisme: {
    id: 'organisme',
    title: 'Dashboard',
    subtitle:
      "Vue d'ensemble de la production et de l'encadrement technique de tous les opérateurs.",
    kpi: {
      production: 'Production nationale du mois',
      planters: 'Planteurs encadrés',
      hectares: 'Superficie encadrée',
      visits: 'Visites réalisées',
    },
    chartHeading: 'Production mensuelle',
    chartSubheading: "Caoutchouc sec, en tonnes, tous opérateurs, face à l'objectif du mois",
    visitsHeading: 'Visites du mois',
    deadlinesSubheading: 'Contrats, rapports et programmes de tous les opérateurs',
  },
  operateur: {
    id: 'operateur',
    title: 'Dashboard du département',
    subtitle: 'Production et encadrement de vos secteurs.',
    kpi: {
      production: 'Production du département',
      planters: 'Planteurs du département',
      hectares: 'Superficie du département',
      visits: 'Visites des secteurs',
    },
    chartHeading: 'Production du département',
    chartSubheading: "Caoutchouc sec, en tonnes, face à l'objectif de votre opérateur",
    visitsHeading: 'Visites des secteurs',
    deadlinesSubheading: 'Rapports et programmes de votre opérateur',
  },
  secteur: {
    id: 'secteur',
    title: 'Dashboard du secteur',
    subtitle: 'Suivi de vos planteurs, de vos parcelles et des visites de vos collaborateurs.',
    kpi: {
      production: 'Production du secteur',
      planters: 'Planteurs du secteur',
      hectares: 'Superficie du secteur',
      visits: 'Visites du secteur',
    },
    chartHeading: 'Production du secteur',
    chartSubheading: "Caoutchouc sec, en tonnes, face à l'objectif du secteur",
    visitsHeading: 'Visites de mon équipe',
    deadlinesSubheading: 'Visites et rapports de votre secteur',
  },
  supervision: {
    id: 'supervision',
    title: 'Dashboard de supervision',
    subtitle: 'Suivi de la réalisation des visites et de la qualité de l’encadrement.',
    kpi: {
      production: 'Production supervisée',
      planters: 'Planteurs suivis',
      hectares: 'Superficie suivie',
      visits: 'Taux de visites réalisées',
    },
    chartHeading: 'Production supervisée',
    chartSubheading: "Caoutchouc sec, en tonnes, face à l'objectif du mois",
    visitsHeading: 'Visites à superviser',
    deadlinesSubheading: 'Rapports et visites à contrôler',
  },
};

export function profileFor(flags: {
  administrator: boolean;
  departmentHead: boolean;
  sectorHead: boolean;
}): DashboardProfileId {
  if (flags.administrator) {
    return 'organisme';
  }
  if (flags.departmentHead) {
    return 'operateur';
  }
  return flags.sectorHead ? 'secteur' : 'supervision';
}
