import type { Tone } from '@shared/models/tone';

import type { RosterStatus } from './planning.rules';

/** Libellé, teinte et action de la secrétaire pour chaque état de planning de son équipe. */
export const ROSTER_STATUS: Readonly<
  Record<RosterStatus, { label: string; tone: Tone; action: string }>
> = {
  NONE: { label: 'Pas de planning', tone: 'red', action: 'Saisir' },
  DRAFT: { label: 'Brouillon', tone: 'neutral', action: 'Compléter' },
  REJECTED: { label: 'Rejeté', tone: 'red', action: 'Corriger' },
  SENT: { label: 'Soumis', tone: 'amber', action: 'Consulter' },
  OK: { label: 'Validé', tone: 'green', action: 'Consulter' },
};

export const ROSTER_STATUS_ORDER: readonly RosterStatus[] = [
  'NONE',
  'DRAFT',
  'SENT',
  'OK',
  'REJECTED',
];

/** Rang d'urgence pour la secrétaire : ce qu'elle doit traiter d'abord. */
export const ROSTER_URGENCY: Readonly<Record<RosterStatus, number>> = {
  REJECTED: 0,
  NONE: 1,
  DRAFT: 2,
  SENT: 3,
  OK: 4,
};

/** Un planning demande une action de la secrétaire tant qu'il n'est ni soumis ni validé. */
export function needsAction(status: RosterStatus): boolean {
  return status === 'NONE' || status === 'DRAFT' || status === 'REJECTED';
}
