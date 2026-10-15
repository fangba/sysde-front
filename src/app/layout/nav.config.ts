import type { IconName } from '@shared/ui/icon/icon.registry';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: IconName;
}

/** Sections de l'application, dans l'ordre d'affichage du menu. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Vue d'ensemble", path: 'tableau-de-bord', icon: 'home' },
  { label: 'Opérateurs', path: 'operateurs', icon: 'building' },
  { label: 'Secteurs et lots', path: 'secteurs', icon: 'map' },
  { label: 'Contrats', path: 'contrats', icon: 'contract' },
  { label: 'Planteurs', path: 'planteurs', icon: 'users' },
  { label: 'Suivi technique', path: 'suivi-technique', icon: 'clipboard' },
  { label: 'Calendrier', path: 'calendrier', icon: 'calendar' },
  { label: 'Rapports', path: 'rapports', icon: 'chart' },
];

/** Libellé d'une section à partir de son chemin (titre des pages « bientôt disponibles »). */
export function navLabel(path: string): string | undefined {
  return NAV_ITEMS.find((item) => item.path === path)?.label;
}
