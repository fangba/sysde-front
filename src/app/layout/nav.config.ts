import type { IconName } from '@shared/ui/icon/icon.registry';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: IconName;
}

/** Sections de l'application, dans l'ordre d'affichage du menu. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: 'tableau-de-bord', icon: 'home' },
  { label: 'Tâches', path: 'taches', icon: 'clipboard' },
  { label: 'Carte', path: 'carte', icon: 'map' },
  { label: 'Paramètres', path: 'parametres', icon: 'settings' },
];

/** Libellé d'une section à partir de son chemin (titre des pages « bientôt disponibles »). */
export function navLabel(path: string): string | undefined {
  return NAV_ITEMS.find((item) => item.path === path)?.label;
}
