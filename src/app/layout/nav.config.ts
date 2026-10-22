import type { IconName } from '@shared/ui/icon/icon.registry';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: IconName;
  /** Section réservée aux administrateurs. */
  readonly adminOnly?: boolean;
  /** Section réservée aux administrateurs, superviseurs et chefs de département et de secteur. */
  readonly managersOnly?: boolean;
  /** Section soumise à `canTask` (masquée pour SU et CF). */
  readonly tasksOnly?: boolean;
  /** Section réservée aux postes qui planifient (voir `canPlan`). */
  readonly planningOnly?: boolean;
}

/** Sections de l'application, dans l'ordre d'affichage du menu. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: 'tableau-de-bord', icon: 'home' },
  { label: 'Tâches', path: 'taches', icon: 'clipboard', tasksOnly: true },
  { label: 'Planning', path: 'planning', icon: 'calendar', planningOnly: true },
  { label: 'Plantations', path: 'plantations', icon: 'leaf' },
  { label: 'Reporting', path: 'reporting', icon: 'chart', managersOnly: true },
  { label: 'Carte', path: 'carte', icon: 'map' },
  { label: 'Paramètres', path: 'parametres', icon: 'settings', adminOnly: true },
  { label: 'Compte', path: 'compte', icon: 'user' },
];

/** Libellé d'une section à partir de son chemin (titre des pages « bientôt disponibles »). */
export function navLabel(path: string): string | undefined {
  return NAV_ITEMS.find((item) => item.path === path)?.label;
}
