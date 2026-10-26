import type { PlanLine } from '../../planning/data/planning.models';
import type { RosterStatus } from '../../planning/data/planning.rules';
import { ROSTER_URGENCY, needsAction } from '../../planning/data/roster';

/** Un collaborateur du secteur et l'état de son planning, tels que la secrétaire les suit. */
export interface StaffEntry {
  readonly userId: string;
  readonly name: string;
  readonly initials: string;
  readonly poste: string;
  readonly status: RosterStatus;
  readonly lines: readonly PlanLine[];
}

/** Nombre de collaborateurs par état de planning. */
export function countByStatus(entries: readonly StaffEntry[]): Record<RosterStatus, number> {
  const counts: Record<RosterStatus, number> = { NONE: 0, DRAFT: 0, REJECTED: 0, SENT: 0, OK: 0 };
  for (const entry of entries) {
    counts[entry.status] += 1;
  }
  return counts;
}

/** Plannings à traiter par la secrétaire, du plus urgent (rejeté) au moins urgent. */
export function toHandle(entries: readonly StaffEntry[]): StaffEntry[] {
  return entries
    .filter((entry) => needsAction(entry.status))
    .sort(
      (a, b) =>
        ROSTER_URGENCY[a.status] - ROSTER_URGENCY[b.status] || a.name.localeCompare(b.name, 'fr'),
    );
}

export interface PosteCoverage {
  readonly poste: string;
  /** Plannings soumis ou validés. */
  readonly sent: number;
  readonly total: number;
}

/** Plannings remis (soumis ou validés) par poste, dans l'ordre donné. */
export function coverageByPoste(
  entries: readonly StaffEntry[],
  order: readonly string[],
): PosteCoverage[] {
  return order
    .map((poste) => {
      const own = entries.filter((e) => e.poste === poste);
      return {
        poste,
        total: own.length,
        sent: own.filter((e) => e.status === 'SENT' || e.status === 'OK').length,
      };
    })
    .filter((c) => c.total > 0);
}

export interface TeamActivity {
  readonly line: PlanLine;
  readonly who: string;
}

/** Prochaines activités de toute l'équipe (en cours ou à venir), de la plus proche à la plus lointaine. */
export function upcomingTeam(
  entries: readonly StaffEntry[],
  today: string,
  limit: number,
): TeamActivity[] {
  return entries
    .flatMap((entry) => entry.lines.map((line) => ({ line, who: entry.name })))
    .filter(({ line }) => line.endDate >= today)
    .sort((a, b) => a.line.date.localeCompare(b.line.date) || a.who.localeCompare(b.who, 'fr'))
    .slice(0, limit);
}
