import type { DashboardData } from './dashboard.models';
import type { DashboardProfileId, DashboardScope } from './dashboard.profile';

/** Part des volumes nationaux relevant de chaque périmètre (données de démonstration). */
const SHARE: Readonly<Record<DashboardProfileId, number>> = {
  organisme: 1,
  supervision: 0.35,
  operateur: 0.22,
  secteur: 0.04,
};

/** Poids de chaque opérateur technique dans les volumes nationaux (démo). */
const OPERATOR_SHARE: Readonly<Record<string, number>> = {
  SAPH: 0.3,
  SOGB: 0.22,
  TRCI: 0.15,
  EXAT: 0.12,
  CCP: 0.09,
  IDH: 0.07,
  CHC: 0.05,
};

/** Restreint les données nationales au périmètre demandé (équivalent du filtrage côté back). */
export function scopeDashboard(data: DashboardData, scope: DashboardScope): DashboardData {
  const filter = scope.profile === 'organisme' ? scope.filterOperator : undefined;
  const k = filter ? (OPERATOR_SHARE[filter] ?? 0) : SHARE[scope.profile];
  const scale = (n: number): number => Math.round(n * k);
  const own = scope.profile === 'operateur' || scope.profile === 'secteur' || !!filter;
  return {
    monthly: data.monthly.map((m) => ({
      ...m,
      produced: scale(m.produced),
      target: scale(m.target),
    })),
    planters: data.planters.map(scale),
    hectares: data.hectares.map(scale),
    visitRate: data.visitRate,
    visits: {
      done: scale(data.visits.done),
      planned: scale(data.visits.planned),
      postponed: scale(data.visits.postponed),
    },
    deadlines: data.deadlines.filter((d) => {
      if (!own) {
        return true;
      }
      if (d.operator !== (filter ?? scope.operator)) {
        return false;
      }
      return scope.profile !== 'secteur' || !d.sector || d.sector === scope.sector;
    }),
  };
}
