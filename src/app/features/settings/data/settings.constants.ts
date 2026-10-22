import type { Tone } from '@shared/models/tone';

import type { ActivityCategory, OperatorType, PlanningPoste, Poste } from './settings.models';

export const OPERATOR_TYPE_LABEL: Readonly<Record<OperatorType, string>> = {
  ORGANISME: 'Organisme (administrateur)',
  TECHNIQUE: 'Opérateur technique',
};

export const POSTE_LABEL: Readonly<Record<Poste, string>> = {
  CD: 'Chef de département',
  CS: 'Chef secteur',
  CF: 'Contrôleur de saignée',
  CO: 'Contrôleur ordinaire',
  FS: 'Formateur',
  MO: 'Moniteur',
  ES: 'Équipe spéciale',
  SE: 'Secrétaire',
  SU: 'Superviseur',
  DI: 'Directeur',
};

/**
 * Postes d'un compte « utilisateur » selon le type d'organisation : directeur et superviseur
 * pour les organismes (APROMAC, FIRCA). Les opérateurs techniques ont leur propre hiérarchie,
 * gérée dans les onglets Chef département, Chef secteur et Collaborateur.
 */
export const POSTES_BY_OPERATOR_TYPE: Readonly<Record<OperatorType, readonly Poste[]>> = {
  ORGANISME: ['DI', 'SU'],
  TECHNIQUE: ['CD'],
};

export const ACTIVE_TONE: Readonly<Record<'true' | 'false', Tone>> = {
  true: 'green',
  false: 'neutral',
};

/** Postes des collaborateurs d'un opérateur technique, placés sous un chef secteur. */
export const COLLABORATOR_POSTES: readonly Poste[] = ['CF', 'CO', 'FS', 'MO', 'ES', 'SE'];

/** Postes du planning, dans l'ordre d'affichage. */
export const PLANNING_POSTE_LIST: readonly PlanningPoste[] = ['CS', 'CF', 'CO', 'FS', 'MO', 'ES'];

export const ACTIVITY_CATEGORIES: readonly {
  readonly code: ActivityCategory;
  readonly label: string;
}[] = [
  { code: 'FORMATION', label: 'Formation' },
  { code: 'VISITE', label: 'Visite' },
  { code: 'RENCONTRE', label: 'Rencontre' },
];

export const ACTIVITY_CATEGORY_LABEL: Readonly<Record<ActivityCategory, string>> =
  Object.fromEntries(ACTIVITY_CATEGORIES.map((c) => [c.code, c.label])) as Record<
    ActivityCategory,
    string
  >;
