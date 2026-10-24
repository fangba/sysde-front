import { COLLABORATOR_POSTES } from '../../settings/data/settings.constants';
import type { Poste } from '../../settings/data/settings.models';

/** Les trois catégories de personnel d'un opérateur technique, une par onglet. */
export type StaffKind = 'chef-departement' | 'chef-secteur' | 'collaborateur';

export interface StaffConfig {
  /** Libellé au singulier, pour les titres de formulaire. */
  readonly singular: string;
  readonly heading: string;
  readonly subheading: string;
  readonly newLabel: string;
  readonly postes: readonly Poste[];
  /** Secteur d'affectation : absent, facultatif ou obligatoire. */
  readonly sector: 'none' | 'optional' | 'required';
  /** Matricule, lot et section : renseignés pour les collaborateurs seulement. */
  readonly assignment: boolean;
  /** Colonne Matricule en première position. */
  readonly showMatricule: boolean;
  /** Champ Matricule dans le formulaire (en première position). */
  readonly matriculeField: boolean;
  readonly created: string;
  readonly updated: string;
}

export const STAFF_CONFIG: Readonly<Record<StaffKind, StaffConfig>> = {
  'chef-departement': {
    singular: 'chef de département',
    heading: 'Chef département',
    subheading: 'Responsables de département des opérateurs d’encadrement.',
    newLabel: 'Nouveau chef de département',
    postes: ['CD'],
    sector: 'none',
    assignment: false,
    showMatricule: true,
    matriculeField: false,
    created: 'Chef de département créé.',
    updated: 'Chef de département modifié.',
  },
  'chef-secteur': {
    singular: 'chef secteur',
    heading: 'Chef secteur',
    subheading:
      'Responsables de secteur, rattachés à un opérateur et à un secteur qui lui est attribué.',
    newLabel: 'Nouveau chef secteur',
    postes: ['CS'],
    sector: 'required',
    assignment: false,
    showMatricule: true,
    matriculeField: true,
    created: 'Chef secteur créé.',
    updated: 'Chef secteur modifié.',
  },
  collaborateur: {
    singular: 'collaborateur',
    heading: 'Collaborateur',
    subheading:
      'Contrôleurs, formateurs, moniteurs, équipe spéciale et secrétaires des opérateurs.',
    newLabel: 'Nouveau collaborateur',
    postes: COLLABORATOR_POSTES,
    sector: 'optional',
    assignment: true,
    showMatricule: true,
    matriculeField: true,
    created: 'Collaborateur créé.',
    updated: 'Collaborateur modifié.',
  },
};
