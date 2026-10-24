/** Un planning annuel est brouillon, soumis au chef secteur ou validé. Un rejet le remet en brouillon. */
export type PlanStatus = 'BROUILLON' | 'SOUMIS' | 'VALIDE';

/** Une activité prévue : une période, un type d'activité, un lot ou une section, une durée. */
export interface PlanLine {
  readonly id: string;
  /** Premier jour (aaaa-mm-jj), dans l'année du planning. */
  readonly date: string;
  /** Dernier jour, inclus ; le même que `date` pour une activité d'un jour. */
  readonly endDate: string;
  /** Activité du référentiel (Paramètres > Activités) propre au poste. */
  readonly activityId: string;
  /** Lot ou section concerné, en texte libre (« Lot 3 », « Section B »). */
  readonly place: string;
  /** Nom de la plantation visitée ; renseigné pour les activités de catégorie Visite. */
  readonly plantation?: string;
  /** Durée prévue, en heures par jour. */
  readonly hours: number;
}
export type PlanLineInput = Omit<PlanLine, 'id'>;

/** Dernier rejet par le chef secteur ; conservé jusqu'à la nouvelle soumission. */
export interface PlanRejection {
  readonly reason: string;
  /** Date ISO du rejet. */
  readonly date: string;
}

/**
 * État d'une activité soumise seule au chef secteur. Une activité sans entrée est en brouillon.
 * `SOUMIS` et `VALIDE` verrouillent ses dates ; `REJETE` la rend de nouveau modifiable.
 */
export type ActivityStatus = 'SOUMIS' | 'VALIDE' | 'REJETE';

export interface ActivitySubmission {
  readonly activityId: string;
  readonly status: ActivityStatus;
  /** Motif du dernier rejet, conservé jusqu'à la nouvelle soumission. */
  readonly rejection?: PlanRejection;
}

/** Planning annuel d'activités d'un compte. */
export interface AnnualPlan {
  readonly id: string;
  readonly userId: string;
  readonly year: number;
  readonly status: PlanStatus;
  readonly lines: readonly PlanLine[];
  readonly rejection?: PlanRejection;
  /** Activités soumises une par une ; vide si aucune ne l'a été. */
  readonly submissions?: readonly ActivitySubmission[];
}

/** Décision du chef secteur sur un planning soumis. */
export type PlanDecision =
  { readonly approve: true } | { readonly approve: false; readonly reason: string };
