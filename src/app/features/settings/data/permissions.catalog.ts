import type { IconName } from '@shared/ui/icon/icon.registry';

import type { Poste } from './settings.models';

/** « Voir » ouvre une consultation ; « Faire » autorise une action qui modifie des données. */
export type PermissionKind = 'voir' | 'faire';

export interface PermissionSection {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
}

export interface PermissionDef {
  readonly code: string;
  readonly section: string;
  readonly kind: PermissionKind;
  readonly label: string;
  readonly description: string;
  /** Droit nécessaire pour exercer celui-ci (une action suppose de voir l'écran). */
  readonly requires?: string;
}

/** Sections de l'application dont l'accès se règle ici. Les Paramètres restent réservés aux administrateurs. */
export const PERMISSION_SECTIONS: readonly PermissionSection[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: 'home' },
  { id: 'taches', label: 'Tâches', icon: 'clipboard' },
  { id: 'reporting', label: 'Reporting', icon: 'chart' },
  { id: 'carte', label: 'Carte', icon: 'map' },
];

export const PERMISSIONS: readonly PermissionDef[] = [
  {
    code: 'dashboard.voir',
    section: 'dashboard',
    kind: 'voir',
    label: 'Voir le tableau de bord',
    description: 'Indicateurs, production et échéances de son périmètre.',
  },
  {
    code: 'taches.voir',
    section: 'taches',
    kind: 'voir',
    label: 'Voir les tâches',
    description: 'Ouvre le menu Tâches et la liste des comptes.',
  },
  {
    code: 'taches.chefs-departement',
    section: 'taches',
    kind: 'faire',
    label: 'Gérer les chefs de département',
    description: 'Créer et modifier les comptes de chef de département.',
    requires: 'taches.voir',
  },
  {
    code: 'taches.chefs-secteur',
    section: 'taches',
    kind: 'faire',
    label: 'Gérer les chefs secteur',
    description: 'Créer et modifier les comptes de chef secteur.',
    requires: 'taches.voir',
  },
  {
    code: 'taches.collaborateurs',
    section: 'taches',
    kind: 'faire',
    label: 'Gérer les collaborateurs',
    description: 'Créer et modifier les comptes de collaborateur.',
    requires: 'taches.voir',
  },
  {
    code: 'reporting.voir',
    section: 'reporting',
    kind: 'voir',
    label: 'Voir le reporting',
    description: 'Rapports et statistiques de son périmètre.',
  },
  {
    code: 'carte.voir',
    section: 'carte',
    kind: 'voir',
    label: 'Voir la carte',
    description: 'Carte des secteurs, lots et parcelles.',
  },
];

/** Postes auxquels l'administrateur attribue des droits, dans l'ordre des colonnes. */
export const GRANTABLE_POSTES: readonly Poste[] = [
  'DI',
  'SU',
  'CD',
  'CS',
  'CF',
  'CO',
  'FS',
  'MO',
  'ES',
  'SE',
];

/** Droits accordés à chaque poste (codes de `PERMISSIONS`). */
export type PermissionGrants = Readonly<Record<Poste, readonly string[]>>;

const ALL_BUT_SUPERVISOR = ['dashboard.voir', 'taches.voir', 'carte.voir'];

/** Droits d'origine : ceux dont l'application disposait avant que l'administrateur puisse les régler. */
export const DEFAULT_GRANTS: PermissionGrants = {
  DI: [
    ...ALL_BUT_SUPERVISOR,
    'taches.chefs-departement',
    'taches.chefs-secteur',
    'taches.collaborateurs',
  ],
  SU: ['dashboard.voir', 'reporting.voir', 'carte.voir'],
  CD: [...ALL_BUT_SUPERVISOR, 'taches.chefs-secteur', 'reporting.voir'],
  CS: [...ALL_BUT_SUPERVISOR, 'taches.collaborateurs', 'reporting.voir'],
  CF: ALL_BUT_SUPERVISOR,
  CO: ALL_BUT_SUPERVISOR,
  FS: ALL_BUT_SUPERVISOR,
  MO: ALL_BUT_SUPERVISOR,
  ES: ALL_BUT_SUPERVISOR,
  SE: ALL_BUT_SUPERVISOR,
};

const BY_CODE = new Map(PERMISSIONS.map((permission) => [permission.code, permission]));

export function permissionOf(code: string): PermissionDef | undefined {
  return BY_CODE.get(code);
}

/**
 * Ajoute ou retire un droit en gardant la cohérence : accorder une action accorde aussi
 * l'accès à son écran ; retirer l'accès à un écran retire les actions qui en dépendent.
 */
export function withPermission(
  granted: readonly string[],
  code: string,
  enabled: boolean,
): readonly string[] {
  const next = new Set(granted);
  if (enabled) {
    next.add(code);
    const required = permissionOf(code)?.requires;
    if (required) {
      next.add(required);
    }
  } else {
    next.delete(code);
    for (const permission of PERMISSIONS) {
      if (permission.requires === code) {
        next.delete(permission.code);
      }
    }
  }
  // Ordre stable : celui du catalogue.
  return PERMISSIONS.map((permission) => permission.code).filter((c) => next.has(c));
}
