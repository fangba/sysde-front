import type { Tone } from '@shared/models/tone';

import type { OperatorType, Poste } from './settings.models';

export const OPERATOR_TYPE_LABEL: Readonly<Record<OperatorType, string>> = {
  ORGANISME: 'Organisme (administrateur)',
  TECHNIQUE: 'Opérateur technique',
};

export const POSTE_LABEL: Readonly<Record<Poste, string>> = {
  CD: 'Chef de département',
  CS: 'Chef de secteur',
  CF: 'Contrôleur formation',
  CO: 'Contrôleur ordinaire',
  FO: 'Formateur',
  MO: 'Moniteur',
  ES: 'Équipe spéciale',
  SE: 'Secrétaire',
  SU: 'Superviseur',
  DI: 'Directeur',
};

/**
 * Postes que l'on peut créer depuis les paramètres, selon le type d'organisation.
 * Les administrateurs créent les chefs de département ; ceux-ci créent ensuite les chefs
 * de secteur, qui créent les techniciens. Directeur et superviseur sont réservés aux organismes.
 */
export const POSTES_BY_OPERATOR_TYPE: Readonly<Record<OperatorType, readonly Poste[]>> = {
  ORGANISME: ['DI', 'SU'],
  TECHNIQUE: ['CD'],
};

export const ACTIVE_TONE: Readonly<Record<'true' | 'false', Tone>> = {
  true: 'green',
  false: 'neutral',
};
